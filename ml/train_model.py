"""
Phase 4 — Model Training

Trains an XGBoost classifier on ml_features.csv to predict
whether a player gets injured in the next 90 days.

Split:
  Training:   seasons 2022/23, 2023/24, 2024/25 (season-level features)
  Validation: 2025/26 GW1-55% (tune threshold)
  Test:       2025/26 GW55%+  (final evaluation)

Output: models/injury_predictor.pkl
        models/feature_importance.csv
"""

import pickle
import numpy as np
import pandas as pd
from sklearn.metrics import (
    precision_recall_curve, auc, f1_score,
    classification_report, average_precision_score,
)
from xgboost import XGBClassifier
from config import ML_FEATURES_CSV, MODEL_FILE, MODELS_DIR, INJURIES_CSV
from model_utils import SigmoidCalibrator

LOOKAHEAD_DAYS = 28
TARGET_COL = f"injured_next_{LOOKAHEAD_DAYS}d"

# ── Columns to exclude from features ─────────────────────────────────────────
NON_FEATURE_COLS = [
    "player_id", "fixture_id", "date", "team",
    TARGET_COL, "season",
    "recurring_injury_type",    # string — not used directly
    "position",                 # encoded version used instead
    "nationality",              # too many categories for now
    "minutes_played_this_match",
]


def load_and_split(path):
    print("Loading ml_features.csv...")
    df = pd.read_csv(path, parse_dates=["date"])
    print(f"  {len(df)} rows, {df['player_id'].nunique()} players")
    print(f"  Date range: {df['date'].min().date()} → {df['date'].max().date()}")

    # Label cutoff: rows beyond (max_injury_date - 90d) have incomplete labels.
    # Keep them in ml_features.csv for prediction, but exclude from val/test.
    injuries        = pd.read_csv(INJURIES_CSV, parse_dates=["start_date"])
    max_injury_date = injuries["start_date"].max()
    label_cutoff    = max_injury_date - pd.Timedelta(days=90)
    print(f"  Label cutoff: {label_cutoff.date()}  (max injury date: {max_injury_date.date()})")

    # Season-based split: train on 2022-2024, validate+test on 2025/26
    train   = df[df["season"].isin([2022, 2023, 2024])]
    current = df[(df["season"] == 2025) & (df["date"] <= label_cutoff)].sort_values("date")

    if len(current) == 0:
        # Injury data not yet refreshed — all 2025/26 rows were cut by the
        # incomplete-window filter in engineer_target.py.
        # Fall back: chronological split within historical data.
        print("\n  ⚠  No 2025/26 rows found — injury data needs refreshing.")
        print("     Run: make refresh-injuries && make refeature")
        print("     Falling back to 60/20/20 chronological split within 2022-2024 data.\n")
        dates     = train["date"].sort_values()
        cut_train = dates.quantile(0.60)
        cut_val   = dates.quantile(0.80)
        val   = train[(train["date"] > cut_train) & (train["date"] <= cut_val)]
        test  = train[train["date"] > cut_val]
        train = train[train["date"] <= cut_train]
        mode  = "fallback chronological"
    else:
        val_cut = current["date"].quantile(0.50)
        val     = current[current["date"] <= val_cut]
        test    = current[current["date"] >  val_cut]
        mode    = "season-based"

    print(f"Split ({mode}):")
    print(f"  Train:      {len(train):6d} rows  ({train[TARGET_COL].mean():.1%} positive)")
    print(f"  Validation: {len(val):6d} rows  ({val[TARGET_COL].mean():.1%} positive)")
    print(f"  Test:       {len(test):6d} rows  ({test[TARGET_COL].mean():.1%} positive)")

    return train, val, test


def get_feature_cols(df):
    return [c for c in df.columns if c not in NON_FEATURE_COLS]


def prepare(df, feature_cols):
    X = df[feature_cols].copy()
    y = df[TARGET_COL].astype(int)
    return X, y


def train(X_train, y_train, X_val, y_val, scale_pos_weight):
    print(f"\nTraining XGBoost (scale_pos_weight={scale_pos_weight:.1f})...")

    model = XGBClassifier(
        n_estimators=500,
        early_stopping_rounds=50,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.7,
        colsample_bytree=0.7,
        min_child_weight=10,
        gamma=2,
        scale_pos_weight=scale_pos_weight,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    return model


def calibrate(model, X_val, y_val):
    print("\nCalibrating probabilities on validation set (sigmoid)...")
    cal = SigmoidCalibrator(model)
    cal.fit(X_val, y_val)
    return cal


def find_best_threshold(model, X_val, y_val):
    """Find threshold that maximises F1 on validation set."""
    probs = model.predict_proba(X_val)[:, 1]
    precision, recall, thresholds = precision_recall_curve(y_val, probs)

    f1_scores = []
    for p, r in zip(precision, recall):
        f1_scores.append(2 * p * r / (p + r) if (p + r) > 0 else 0)

    best_idx       = np.argmax(f1_scores)
    best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
    best_f1        = f1_scores[best_idx]

    print(f"  Best threshold (val F1): {best_threshold:.3f}  →  F1={best_f1:.3f}")
    return best_threshold


def evaluate(model, X, y, label, threshold=0.5):
    probs  = model.predict_proba(X)[:, 1]
    preds  = (probs >= threshold).astype(int)
    pr_auc = average_precision_score(y, probs)
    f1     = f1_score(y, preds, zero_division=0)

    print(f"\n── {label} ──────────────────────────────────────")
    print(f"  PR-AUC:    {pr_auc:.4f}")
    print(f"  F1:        {f1:.4f}  (threshold={threshold:.3f})")
    print(f"\n  Classification report:")
    print(classification_report(y, preds, target_names=["Not injured", "Injured"], zero_division=0))

    # Calibration check
    print(f"  Calibration (predicted risk bucket → actual injury rate):")
    for bucket in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]:
        mask = (probs >= bucket) & (probs < bucket + 0.1)
        if mask.sum() > 0:
            actual = y[mask].mean()
            print(f"    {bucket:.0%}–{bucket+0.1:.0%}:  {mask.sum():4d} players  →  {actual:.1%} actual")

    return pr_auc, f1


def save_feature_importance(model, feature_cols):
    importance = pd.DataFrame({
        "feature":    feature_cols,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)

    imp_path = MODELS_DIR / "feature_importance.csv"
    importance.to_csv(imp_path, index=False)

    print(f"\nTop 15 features:")
    print(importance.head(15).to_string(index=False))
    print(f"\nSaved: {imp_path}")


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    train_df, val_df, test_df = load_and_split(ML_FEATURES_CSV)
    feature_cols = get_feature_cols(train_df)
    print(f"\nFeatures used: {len(feature_cols)}")

    X_train, y_train = prepare(train_df, feature_cols)
    X_val,   y_val   = prepare(val_df,   feature_cols)
    X_test,  y_test  = prepare(test_df,  feature_cols)

    # Handle class imbalance
    neg = (y_train == 0).sum()
    pos = (y_train == 1).sum()
    scale_pos_weight = neg / pos if pos > 0 else 1.0
    print(f"\nClass balance — neg: {neg}, pos: {pos}, ratio: {scale_pos_weight:.1f}")

    # Train
    model = train(X_train, y_train, X_val, y_val, scale_pos_weight)

    # Calibrate on val set — corrects the train/live positive-rate distribution shift
    calibrated_model = calibrate(model, X_val, y_val)

    # Find best threshold on calibrated val predictions
    threshold = find_best_threshold(calibrated_model, X_val, y_val)

    # Evaluate on all splits (use calibrated model for val + test)
    evaluate(model,            X_train, y_train, "Training set (raw)",        threshold)
    evaluate(calibrated_model, X_val,   y_val,   "Validation set (cal.)",     threshold)
    pr_auc, f1 = evaluate(calibrated_model, X_test, y_test, "Test set (cal.)", threshold)

    # Feature importance (from uncalibrated model — calibrator doesn't change importances)
    save_feature_importance(model, feature_cols)

    # Save calibrated model + metadata as a bundle
    bundle = {
        "model":        calibrated_model,   # calibrated — used for all predictions
        "raw_model":    model,              # raw XGBoost — for SHAP / feature importance
        "feature_cols": feature_cols,
        "threshold":    threshold,
        "pr_auc":       pr_auc,
        "f1":           f1,
    }
    with open(MODEL_FILE, "wb") as f:
        pickle.dump(bundle, f)

    print(f"\n{'─'*50}")
    print(f"Model saved:   {MODEL_FILE}")
    print(f"PR-AUC (test): {pr_auc:.4f}")
    print(f"F1 (test):     {f1:.4f}")


if __name__ == "__main__":
    main()