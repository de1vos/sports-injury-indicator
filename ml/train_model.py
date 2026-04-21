"""
Phase 4 — Model Training

Trains an XGBoost classifier on ml_features.csv to predict
whether a player gets injured in the next 90 days.

Split strategy (uses label_complete column from engineer_target.py):
  Training:   all historical rows with label_complete=True (seasons 2022-2024)
  Validation: first 60% of labeled rows (chronological fallback)
  Test:       last 40% of labeled rows

Current-season (2025/26) rows always have label_complete=False — their 90-day
observation window hasn't closed yet, so they are excluded from all splits
and used only for inference in predict_players.py.

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
from config import ML_FEATURES_CSV, MODEL_FILE, MODELS_DIR
from model_utils import SigmoidCalibrator


# ── Columns to exclude from features ─────────────────────────────────────────
NON_FEATURE_COLS = [
    "player_id", "fixture_id", "date", "team",
    "injured_next_90d", "season",
    "label_complete",            # split gate — not a predictive feature
    "recurring_injury_type",     # string — not used directly
    "position",                  # encoded version used instead
    "nationality",               # too many categories for now
    "minutes_played_this_match",
]


def load_and_split(path):
    print("Loading ml_features.csv...")
    df = pd.read_csv(path, parse_dates=["date"])
    print(f"  {len(df)} rows, {df['player_id'].nunique()} players")
    print(f"  Date range: {df['date'].min().date()} → {df['date'].max().date()}")

    if "label_complete" not in df.columns:
        raise ValueError(
            "Column 'label_complete' not found in ml_features.csv. "
            "Re-run engineer_target.py to regenerate the feature matrix."
        )

    # Only rows whose 90-day observation window has fully closed are used for
    # training/val/test. Current-season rows (label_complete=False) are excluded
    # — they are used for inference only in predict_players.py.
    labeled = df[df["label_complete"] == True].copy()
    n_inference = (df["label_complete"] == False).sum()
    print(f"  Labeled (training-safe): {len(labeled)}  |  Inference-only: {n_inference}")

    if len(labeled) == 0:
        raise ValueError("No rows with label_complete=True found. Re-run engineer_target.py.")

    # Chronological 60/20/20 split within labeled historical data
    labeled = labeled.sort_values("date")
    dates     = labeled["date"]
    cut_train = dates.quantile(0.60)
    cut_val   = dates.quantile(0.80)

    train = labeled[labeled["date"] <= cut_train]
    val   = labeled[(labeled["date"] > cut_train) & (labeled["date"] <= cut_val)]
    test  = labeled[labeled["date"] > cut_val]

    print(f"\nSplit (chronological 60/20/20 on labeled rows):")
    print(f"  Train:      {len(train):6d} rows  "
          f"({train['date'].min().date()} → {train['date'].max().date()})  "
          f"({train['injured_next_90d'].mean():.1%} positive)")
    print(f"  Validation: {len(val):6d} rows  "
          f"({val['date'].min().date()} → {val['date'].max().date()})  "
          f"({val['injured_next_90d'].mean():.1%} positive)")
    print(f"  Test:       {len(test):6d} rows  "
          f"({test['date'].min().date()} → {test['date'].max().date()})  "
          f"({test['injured_next_90d'].mean():.1%} positive)")

    return train, val, test


def get_feature_cols(df):
    return [c for c in df.columns if c not in NON_FEATURE_COLS]


def prepare(df, feature_cols):
    X = df[feature_cols].copy()
    y = df["injured_next_90d"].astype(int)
    return X, y


def train(X_train, y_train, scale_pos_weight):
    print(f"\nTraining XGBoost (scale_pos_weight={scale_pos_weight:.1f})...")

    model = XGBClassifier(
        n_estimators=200,       # fewer trees → less overfitting (was 500)
        max_depth=3,            # shallower trees → better generalisation (was 5)
        learning_rate=0.05,
        subsample=0.6,          # more aggressive row sampling (was 0.8)
        colsample_bytree=0.8,
        min_child_weight=5,     # higher leaf weight → more conservative (was 3)
        scale_pos_weight=scale_pos_weight,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X_train, y_train)
    return model


def calibrate(model, X_val, y_val):
    print("\nCalibrating probabilities on validation set (sigmoid/Platt)...")
    calibrated = SigmoidCalibrator(model)
    calibrated.fit(X_val, y_val)
    return calibrated


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
    model = train(X_train, y_train, scale_pos_weight)

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
