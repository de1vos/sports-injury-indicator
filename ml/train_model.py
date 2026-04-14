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
from config import ML_FEATURES_CSV, MODEL_FILE, MODELS_DIR


# ── Columns to exclude from features ─────────────────────────────────────────
NON_FEATURE_COLS = [
    "player_id", "fixture_id", "date", "team",
    "injured_next_90d", "season",
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

    # Chronological split within available data (all 2025/26)
    # Train: first 60% of dates, Val: next 20%, Test: last 20%
    dates      = df["date"].sort_values()
    train_cut  = dates.quantile(0.60)
    val_cut    = dates.quantile(0.80)

    train = df[df["date"] <= train_cut]
    val   = df[(df["date"] > train_cut) & (df["date"] <= val_cut)]
    test  = df[df["date"] > val_cut]

    print(f"\nSplit (chronological):")
    print(f"  Train:      {len(train)} rows  up to {train_cut.date()}  ({train['injured_next_90d'].mean():.1%} positive)")
    print(f"  Validation: {len(val)} rows  up to {val_cut.date()}    ({val['injured_next_90d'].mean():.1%} positive)")
    print(f"  Test:       {len(test)} rows  from {test['date'].min().date()}   ({test['injured_next_90d'].mean():.1%} positive)")

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
        n_estimators=500,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        scale_pos_weight=scale_pos_weight,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    model.fit(X_train, y_train)
    return model


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

    # Find best threshold on validation set
    threshold = find_best_threshold(model, X_val, y_val)

    # Evaluate on all splits
    evaluate(model, X_train, y_train, "Training set",   threshold)
    evaluate(model, X_val,   y_val,   "Validation set", threshold)
    pr_auc, f1 = evaluate(model, X_test, y_test, "Test set", threshold)

    # Feature importance
    save_feature_importance(model, feature_cols)

    # Save model + metadata as a bundle
    bundle = {
        "model":        model,
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
