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
from sklearn.metrics import average_precision_score, brier_score_loss
from xgboost import XGBClassifier
from config import ML_FEATURES_CSV, MODEL_FILE, MODELS_DIR, INJURIES_CSV, PLAYERS_CSV

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
    print(f"  {len(df)} rows, {df['player_id'].nunique()} players (all competitions)")
    print(f"  Date range: {df['date'].min().date()} → {df['date'].max().date()}")

    # Filter to PL players only — cup-opponent rows (UCL/FA Cup/EFL opponents) have
    # almost no injury records (~1.8% coverage) producing false negatives that suppress
    # model sensitivity. PL player rows from cup matches are preserved.
    pl_player_ids = set(pd.read_csv(PLAYERS_CSV)["player_id"])
    before = len(df)
    df = df[df["player_id"].isin(pl_player_ids)]
    print(f"  {len(df)} rows after filtering to PL players ({before - len(df)} cup-opponent rows removed)")

    # Label cutoff: rows beyond (max_injury_date - 90d) have incomplete labels.
    # Keep them in ml_features.csv for prediction, but exclude from val/test.
    injuries        = pd.read_csv(INJURIES_CSV, parse_dates=["start_date"])
    max_injury_date = injuries["start_date"].max()
    # Label cutoff: intentionally larger than LOOKAHEAD_DAYS (28d) to account for
    # API recording lag — injuries from the past ~60 days are often not yet in the
    # database. Using only 28d adds rows with ~0.8% positive rate (vs 5.6% baseline),
    # causing severe label noise. 90d = 28d lookahead + ~62d API completeness buffer.
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
    print("\nCalibrating probabilities on validation set (isotonic)...")
    from sklearn.isotonic import IsotonicRegression
    from model_utils import IsotonicCalibratedModel
    
    raw_val_probs = model.predict_proba(X_val)[:, 1]
    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(raw_val_probs, y_val)
    
    cal = IsotonicCalibratedModel(model, iso)
    return cal



def top_k_precision(probs, y, k):
    """
    Precision@K: of the K highest-risk rows, what fraction actually got injured?
    This is the most clinically meaningful metric — it mirrors real usage where
    a physio acts on the top N flagged players, not on a fixed threshold.
    Also reports the lift over random (= base rate).
    """
    top_k_idx    = np.argsort(probs)[-k:]
    precision_k  = y.iloc[top_k_idx].mean() if hasattr(y, "iloc") else y[top_k_idx].mean()
    base_rate    = y.mean()
    lift         = precision_k / base_rate if base_rate > 0 else float("nan")
    return precision_k, lift


def evaluate(model, X, y, label):
    probs  = model.predict_proba(X)[:, 1]
    pr_auc = average_precision_score(y, probs)

    # Brier Score: mean squared error of probabilities (lower = better)
    # Brier Skill Score: improvement over naive baseline (always predict base rate)
    #   BSS = 0 → no better than guessing; BSS = 1 → perfect
    brier       = brier_score_loss(y, probs)
    base_rate   = y.mean()
    brier_naive = base_rate * (1 - base_rate)  # Brier score of always predicting base rate
    brier_skill = 1 - (brier / brier_naive) if brier_naive > 0 else float("nan")

    print(f"\n── {label} ──────────────────────────────────────")
    print(f"  PR-AUC:       {pr_auc:.4f}")
    print(f"  Brier Score:  {brier:.4f}  (naive baseline: {brier_naive:.4f})")
    print(f"  Brier Skill:  {brier_skill:+.3f}  (0 = no better than random, 1 = perfect)")

    # Calibration: does a higher score actually mean a higher injury rate?
    # Use percentile-based boundaries so buckets always populate regardless of
    # how compressed the score distribution is (calibrated scores range ~1%–16%).
    print(f"\n  Calibration (base rate = {base_rate:.1%}):")
    print(f"    {'Risk bucket':>14}  {'N':>6}  {'Actual rate':>12}  {'Lift':>6}")
    percentile_cuts = [0, 25, 50, 75, 90, 100]
    boundaries = [np.percentile(probs, p) for p in percentile_cuts]
    for lo, hi in zip(boundaries[:-1], boundaries[1:]):
        mask = (probs >= lo) & (probs < hi) if hi < boundaries[-1] else (probs >= lo) & (probs <= hi)
        if mask.sum() > 0:
            actual = y[mask].mean()
            lift   = actual / base_rate if base_rate > 0 else float("nan")
            print(f"    {lo:.1%}–{hi:.1%}:  {mask.sum():6d}  {actual:>12.1%}  {lift:>5.2f}×")

    # Top-K Precision: of my N highest-risk flags, how many actually got injured?
    print(f"\n  Top-K Precision:")
    print(f"    {'K':>6}  {'Precision':>10}  {'Lift':>8}")
    for k in [10, 20, 50, 100]:
        if k > len(probs):
            continue
        p_k, lift = top_k_precision(probs, y, k)
        print(f"    {k:>6}  {p_k:>10.1%}  {lift:>7.2f}×")

    return pr_auc


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

    # Evaluate on all three splits
    # Training: raw model (calibration was fit on val, so don't apply it here)
    evaluate(model,            X_train, y_train, "Training set (raw — overfitting check)")
    evaluate(calibrated_model, X_val,   y_val,   "Validation set (calibrated)")
    pr_auc = evaluate(calibrated_model, X_test,  y_test,  "Test set (calibrated)")

    # Feature importance (from uncalibrated model — calibrator doesn't change importances)
    save_feature_importance(model, feature_cols)

    # Save calibrated model + metadata as a bundle
    bundle = {
        "model":        calibrated_model,   # calibrated — used for all predictions
        "raw_model":    model,              # raw XGBoost — for SHAP / feature importance
        "feature_cols": feature_cols,
        "pr_auc":       pr_auc,
    }
    with open(MODEL_FILE, "wb") as f:
        pickle.dump(bundle, f)

    print(f"\n{'─'*50}")
    print(f"Model saved:   {MODEL_FILE}")
    print(f"PR-AUC (test): {pr_auc:.4f}")


if __name__ == "__main__":
    main()