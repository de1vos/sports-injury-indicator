"""
Step 3.5 — Target variable + final feature matrix assembly

For each player-match row, looks 90 days forward in the injury table
to set the target: did a new non-suspension injury start within 90 days?

Also joins all feature tables into the final ml_features.csv.

Output: data/ml_features.csv — one row per player per match, all features + target
"""

import pandas as pd
from config import (
    INJURIES_CSV, MATCH_STATS_CSV, ML_FEATURES_CSV, DATA_DIR, ALL_SEASONS, CURRENT_SEASON
)

ROLLING_FILE  = DATA_DIR / "rolling_features.csv"
SEASON_FILE   = DATA_DIR / "season_features.csv"
INJURY_FILE   = DATA_DIR / "injury_features.csv"
PROFILE_FILE  = DATA_DIR / "profile_features.csv"

LOOKAHEAD_DAYS = 90


def compute_target(player_injuries, ref_date):
    """
    Returns 1 if a new non-suspension injury started within LOOKAHEAD_DAYS
    after ref_date, else 0.
    """
    future_cutoff = ref_date + pd.Timedelta(days=LOOKAHEAD_DAYS)

    future_injuries = player_injuries[
        (player_injuries["start_date"] > ref_date) &
        (player_injuries["start_date"] <= future_cutoff) &
        (~player_injuries["injury_type"].str.lower().str.contains("suspend", na=False))
    ]
    return int(len(future_injuries) > 0)


def main():
    # ── Load all feature tables ───────────────────────────────────────────────
    print("Loading feature tables...")

    rolling  = pd.read_csv(ROLLING_FILE,  parse_dates=["date"])
    season   = pd.read_csv(SEASON_FILE)
    injury_f = pd.read_csv(INJURY_FILE,   parse_dates=["date"])
    profile  = pd.read_csv(PROFILE_FILE)
    injuries = pd.read_csv(INJURIES_CSV,  parse_dates=["start_date", "end_date"])
    matches  = pd.read_csv(MATCH_STATS_CSV, parse_dates=["date"])

    print(f"  Rolling features:  {len(rolling)} rows")
    print(f"  Season features:   {len(season)} rows")
    print(f"  Injury features:   {len(injury_f)} rows")
    print(f"  Profile features:  {len(profile)} rows")

    # ── Compute target variable ───────────────────────────────────────────────
    print("\nComputing target variable (injured_next_90d)...")

    targets = []
    total   = rolling["player_id"].nunique()
    done    = 0

    for player_id, group in rolling.groupby("player_id"):
        player_injuries = injuries[injuries["player_id"] == player_id]
        done += 1
        if done % 100 == 0:
            print(f"  {done}/{total}...")

        for _, row in group.iterrows():
            target = compute_target(player_injuries, row["date"])
            targets.append({
                "player_id":  player_id,
                "fixture_id": row["fixture_id"],
                "date":       row["date"],
                "injured_next_90d": target,
            })

    target_df = pd.DataFrame(targets)

    positive_rate = target_df["injured_next_90d"].mean()
    print(f"  Target positive rate: {positive_rate:.1%}  ({target_df['injured_next_90d'].sum()} / {len(target_df)})")

    # ── Join all features ─────────────────────────────────────────────────────
    print("\nJoining all features...")

    # Base: rolling features (player_id + fixture_id + date)
    df = rolling.copy()

    # Join injury features (on player_id + fixture_id)
    df = df.merge(
        injury_f.drop(columns=["date"]),
        on=["player_id", "fixture_id"],
        how="left",
    )

    # Join season features (on player_id)
    season_cols = [
        "player_id",
        "minutes_vs_last_season",
        "duels_per_90_vs_last_season",
        "appearances_pace",
    ]
    df = df.merge(season[season_cols], on="player_id", how="left")

    # Join profile features (on player_id)
    profile_cols = [
        "player_id", "age", "age_squared",
        "height", "weight",
        "position_encoded",
        "is_goalkeeper", "is_defender", "is_midfielder", "is_attacker",
    ]
    df = df.merge(profile[profile_cols], on="player_id", how="left")

    # Join target
    df = df.merge(
        target_df[["player_id", "fixture_id", "injured_next_90d"]],
        on=["player_id", "fixture_id"],
        how="left",
    )

    # ── Add season label from match_stats (correct 2022/2023/2024/2025) ─────────
    df = df.merge(
        matches[["player_id", "fixture_id", "season"]].drop_duplicates(),
        on=["player_id", "fixture_id"],
        how="left",
    )

    # ── Drop rows whose 90-day forward window hasn't closed yet ───────────────
    # Only applies to historical training seasons — current season rows are kept
    # regardless (labels will be NaN/0, but they're used for prediction only).
    max_injury_date = injuries["start_date"].max()
    label_cutoff    = max_injury_date - pd.Timedelta(days=LOOKAHEAD_DAYS)
    before_cutoff   = len(df)
    df = df[(df["date"] <= label_cutoff) | (df["season"] == CURRENT_SEASON)]
    dropped_cutoff  = before_cutoff - len(df)
    if dropped_cutoff:
        print(f"  Dropped {dropped_cutoff} rows beyond label cutoff "
              f"(max injury date: {max_injury_date.date()}, cutoff: {label_cutoff.date()})"
              f" — current season rows kept regardless")

    # ── Drop rows with no target (shouldn't happen, but safety check) ─────────
    before = len(df)
    df = df.dropna(subset=["injured_next_90d"])
    if before != len(df):
        print(f"  Dropped {before - len(df)} rows with missing target")

    df = df.sort_values(["player_id", "date"]).reset_index(drop=True)

    # ── Save ──────────────────────────────────────────────────────────────────
    ML_FEATURES_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(ML_FEATURES_CSV, index=False)

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'─'*50}")
    print(f"Final feature matrix shape: {df.shape}")
    print(f"Rows:            {len(df)}")
    print(f"Features:        {df.shape[1] - 3} (excl. player_id, date, fixture_id)")
    print(f"Players:         {df['player_id'].nunique()}")
    print(f"Date range:      {df['date'].min().date()} → {df['date'].max().date()}")
    print(f"Target rate:     {df['injured_next_90d'].mean():.1%}")

    print(f"\nNull counts (top 10):")
    nulls = df.isnull().sum().sort_values(ascending=False).head(10)
    print(nulls[nulls > 0].to_string())

    print(f"\nColumns ({df.shape[1]}):")
    print(list(df.columns))

    print(f"\nSaved: {ML_FEATURES_CSV}")


if __name__ == "__main__":
    main()
