"""
Step 3.1 — Rolling match features

For each player at each match date, compute backwards-looking
workload and intensity features from match_stats.csv.

Output: data/rolling_features.csv — one row per player per match
"""

import numpy as np
import pandas as pd
from config import MATCH_STATS_CSV, DATA_DIR


OUTPUT_FILE = DATA_DIR / "rolling_features.csv"


def per_90(value, minutes):
    """Normalise a stat to per-90-minutes rate."""
    if minutes and minutes > 0:
        return (value or 0) / minutes * 90
    return None


def rolling_window(df_player, ref_date, days):
    """Rows for a player within [ref_date - days, ref_date)."""
    cutoff = ref_date - pd.Timedelta(days=days)
    return df_player[(df_player["date"] >= cutoff) & (df_player["date"] < ref_date)]


def last_n_matches(df_player, ref_date, n):
    """Most recent n matches strictly before ref_date."""
    past = df_player[df_player["date"] < ref_date].sort_values("date", ascending=False)
    return past.head(n)


def compute_features(df_player, ref_date):
    """Compute all rolling features for one player at one reference date."""

    w7   = rolling_window(df_player, ref_date, 7)
    w14  = rolling_window(df_player, ref_date, 14)
    w30  = rolling_window(df_player, ref_date, 30)
    w60  = rolling_window(df_player, ref_date, 60)
    prev30 = rolling_window(
        df_player,
        ref_date - pd.Timedelta(days=30),
        30,
    )
    last5  = last_n_matches(df_player, ref_date, 5)
    last10 = last_n_matches(df_player, ref_date, 10)

    # ── Minutes ──────────────────────────────────────────────────────────────
    minutes_7d  = w7["minutes"].sum()
    minutes_14d = w14["minutes"].sum()
    minutes_30d = w30["minutes"].sum()
    minutes_60d = w60["minutes"].sum()
    prev_minutes_30d = prev30["minutes"].sum()

    # ── Matches played ───────────────────────────────────────────────────────
    matches_14d = len(w14)
    matches_30d = len(w30)

    # ── Days since last match ────────────────────────────────────────────────
    past = df_player[df_player["date"] < ref_date]
    if not past.empty:
        days_since_last = (ref_date - past["date"].max()).days
    else:
        days_since_last = None

    # ── Avg minutes per match (last 30d) ─────────────────────────────────────
    avg_min_30d = (minutes_30d / matches_30d) if matches_30d > 0 else None

    # ── Workload trend ───────────────────────────────────────────────────────
    if prev_minutes_30d > 0:
        workload_trend = (minutes_30d - prev_minutes_30d) / prev_minutes_30d
    else:
        workload_trend = None

    # ── Acute:Chronic Workload Ratio ─────────────────────────────────────────
    avg_weekly_28d = minutes_60d / 4 if minutes_60d > 0 else None
    if avg_weekly_28d and avg_weekly_28d > 0:
        acwr = minutes_7d / avg_weekly_28d
    else:
        acwr = None

    # ── Per-90 rolling stats (last 5 matches) ────────────────────────────────
    if not last5.empty:
        total_min_l5 = last5["minutes"].sum()
        duels_per_90_l5     = per_90(last5["duels_total"].sum(),     total_min_l5)
        tackles_per_90_l5   = per_90(last5["tackles"].sum(),         total_min_l5)
        dribbles_per_90_l5  = per_90(last5["dribbles_attempts"].sum(), total_min_l5)
        fouls_comm_per_90   = per_90(last5["fouls_committed"].sum(), total_min_l5)
        fouls_drawn_per_90  = per_90(last5["fouls_drawn"].sum(),     total_min_l5)
    else:
        duels_per_90_l5 = tackles_per_90_l5 = dribbles_per_90_l5 = None
        fouls_comm_per_90 = fouls_drawn_per_90 = None

    # ── Rating trend ─────────────────────────────────────────────────────────
    rated_l5  = last5["rating"].dropna()
    rated_l10 = last10["rating"].dropna()
    if len(rated_l5) >= 3 and len(rated_l10) >= 6:
        prev5_ratings = rated_l10.iloc[5:]
        rating_trend  = rated_l5.mean() - prev5_ratings.mean()
    else:
        rating_trend = None

    # ── Consecutive 90-min starts ────────────────────────────────────────────
    sorted_past = df_player[df_player["date"] < ref_date].sort_values("date", ascending=False)
    consecutive_90 = 0
    for _, row in sorted_past.iterrows():
        if (row["minutes"] or 0) >= 90:
            consecutive_90 += 1
        else:
            break

    # ── Yellow cards last 30d ────────────────────────────────────────────────
    yellow_30d = w30["yellow_cards"].sum()

    # ── Match density 14d ────────────────────────────────────────────────────
    match_density_14d = matches_14d

    return {
        "minutes_last_7d":             int(minutes_7d),
        "minutes_last_14d":            int(minutes_14d),
        "minutes_last_30d":            int(minutes_30d),
        "minutes_last_60d":            int(minutes_60d),
        "matches_last_14d":            matches_14d,
        "matches_last_30d":            matches_30d,
        "days_since_last_match":       days_since_last,
        "avg_minutes_per_match_30d":   avg_min_30d,
        "workload_trend":              workload_trend,
        "acute_chronic_ratio":         acwr,
        "match_density_14d":           match_density_14d,
        "duels_per_90_rolling":        duels_per_90_l5,
        "tackles_per_90_rolling":      tackles_per_90_l5,
        "dribbles_per_90_rolling":     dribbles_per_90_l5,
        "fouls_committed_per_90_rolling": fouls_comm_per_90,
        "fouls_against_per_90_rolling":   fouls_drawn_per_90,
        "rating_trend":                rating_trend,
        "consecutive_90min_starts":    consecutive_90,
        "yellow_cards_last_30d":       int(yellow_30d),
    }


def main():
    print("Loading match_stats.csv...")
    df = pd.read_csv(MATCH_STATS_CSV, parse_dates=["date"])
    print(f"  {len(df)} rows, {df['player_id'].nunique()} players, {df['fixture_id'].nunique()} fixtures")

    # Fill missing numeric cols with 0 for aggregation
    num_cols = ["minutes", "duels_total", "tackles", "dribbles_attempts",
                "fouls_committed", "fouls_drawn", "yellow_cards", "rating"]
    for col in num_cols:
        if col not in df.columns:
            df[col] = 0
    df[num_cols] = df[num_cols].fillna(0)
    df.loc[df["rating"] == 0, "rating"] = np.nan

    rows = []
    players = df.groupby("player_id")
    total   = df["player_id"].nunique()

    print(f"\nComputing rolling features for {total} players...")

    for i, (player_id, df_player) in enumerate(players, 1):
        df_player = df_player.sort_values("date").copy()

        if i % 100 == 0:
            print(f"  {i}/{total}...")

        # Compute features at each match date (the moment just before that match)
        for _, match_row in df_player.iterrows():
            ref_date = match_row["date"]
            features = compute_features(df_player, ref_date)

            rows.append({
                "player_id":  player_id,
                "fixture_id": match_row["fixture_id"],
                "date":       ref_date,
                "team":       match_row["team"],
                "minutes_played_this_match": match_row["minutes"],
                **features,
            })

    out = pd.DataFrame(rows)
    out = out.sort_values(["player_id", "date"]).reset_index(drop=True)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT_FILE, index=False)

    print(f"\n{'─'*50}")
    print(f"Rows:            {len(out)}")
    print(f"Players:         {out['player_id'].nunique()}")
    print(f"Date range:      {out['date'].min().date()} → {out['date'].max().date()}")
    print(f"\nFeature sample (first player):")
    sample_cols = ["date", "minutes_last_30d", "matches_last_14d",
                   "acute_chronic_ratio", "workload_trend", "consecutive_90min_starts"]
    print(out[out["player_id"] == out["player_id"].iloc[0]][sample_cols].tail(5).to_string(index=False))
    print(f"\nSaved: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
