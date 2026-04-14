"""
Step 3.3 — Injury history features

For each player, compute career injury features from injuries.csv.
All features look backwards from a reference date to avoid leakage.

Output: data/injury_features.csv — one row per player per reference date
        (reference dates = each match date the player appeared in)
"""

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats
from config import INJURIES_CSV, MATCH_STATS_CSV, DATA_DIR

OUTPUT_FILE = DATA_DIR / "injury_features.csv"


def compute_injury_features(df_player_injuries, ref_date):
    """
    Compute all injury history features for one player
    looking backwards from ref_date.
    Suspensions are excluded from injury counts.
    """
    # Exclude suspensions
    injuries = df_player_injuries[
        ~df_player_injuries["injury_type"].str.lower().str.contains("suspend", na=False)
    ].copy()

    # Only look at injuries that started before ref_date
    past = injuries[injuries["start_date"] < ref_date]

    if past.empty:
        return {
            "career_total_injuries":      0,
            "injuries_last_12_months":    0,
            "injuries_last_24_months":    0,
            "days_missed_last_12_months": 0,
            "days_missed_last_24_months": 0,
            "days_since_last_injury":     None,
            "is_recently_returned":       0,
            "recurring_injury_flag":      0,
            "recurring_injury_type":      None,
            "avg_recovery_days":          None,
            "recovery_trend":             None,
            "longest_injury_days":        None,
            "matches_missed_career":      0,
            "matches_missed_this_season": 0,
            "minutes_missed_this_season": 0,
            "injuries_this_season":       0,
        }

    # ── Counts ────────────────────────────────────────────────────────────────
    career_total = len(past)

    cutoff_12m = ref_date - pd.Timedelta(days=365)
    cutoff_24m = ref_date - pd.Timedelta(days=730)
    season_start = pd.Timestamp("2025-08-01")

    last_12m = past[past["start_date"] >= cutoff_12m]
    last_24m = past[past["start_date"] >= cutoff_24m]
    this_season = past[past["start_date"] >= season_start]

    # ── Days missed ───────────────────────────────────────────────────────────
    days_missed_12m = last_12m["days_out"].fillna(0).sum()
    days_missed_24m = last_24m["days_out"].fillna(0).sum()

    # ── Days since last injury ended ──────────────────────────────────────────
    ended = past[past["end_date"].notna() & (past["end_date"] < ref_date)]
    if not ended.empty:
        last_end = ended["end_date"].max()
        days_since_last = (ref_date - last_end).days
        is_recently_returned = int(days_since_last <= 30)
    else:
        days_since_last      = None
        is_recently_returned = 0

    # ── Recurring injury flag ─────────────────────────────────────────────────
    type_counts = past["injury_type"].value_counts()
    recurring   = type_counts[type_counts >= 2]
    recurring_flag = int(len(recurring) > 0)
    recurring_type = recurring.index[0] if recurring_flag else None

    # ── Recovery stats ────────────────────────────────────────────────────────
    valid_days = past["days_out"].dropna()
    avg_recovery   = valid_days.mean() if len(valid_days) > 0 else None
    longest_injury = valid_days.max()  if len(valid_days) > 0 else None

    # Recovery trend — slope of days_out over time (positive = getting worse)
    if len(valid_days) >= 3:
        x = np.arange(len(valid_days))
        slope, _, _, _, _ = scipy_stats.linregress(x, valid_days.values)
        recovery_trend = slope
    else:
        recovery_trend = None

    # ── Estimated missed matches ──────────────────────────────────────────────
    # Rough estimate: days_out / 7 * (38/52) matches per week in PL season
    matches_per_week = 38 / 46  # ~0.83
    matches_missed_career  = int(past["days_out"].fillna(0).sum() / 7 * matches_per_week)
    matches_missed_season  = int(this_season["days_out"].fillna(0).sum() / 7 * matches_per_week)
    minutes_missed_season  = matches_missed_season * 90

    return {
        "career_total_injuries":      career_total,
        "injuries_last_12_months":    len(last_12m),
        "injuries_last_24_months":    len(last_24m),
        "days_missed_last_12_months": int(days_missed_12m),
        "days_missed_last_24_months": int(days_missed_24m),
        "days_since_last_injury":     days_since_last,
        "is_recently_returned":       is_recently_returned,
        "recurring_injury_flag":      recurring_flag,
        "recurring_injury_type":      recurring_type,
        "avg_recovery_days":          avg_recovery,
        "recovery_trend":             recovery_trend,
        "longest_injury_days":        longest_injury,
        "matches_missed_career":      matches_missed_career,
        "matches_missed_this_season": matches_missed_season,
        "minutes_missed_this_season": minutes_missed_season,
        "injuries_this_season":       len(this_season),
    }


def main():
    print("Loading injuries.csv...")
    injuries = pd.read_csv(INJURIES_CSV, parse_dates=["start_date", "end_date"])
    print(f"  {len(injuries)} injury records, {injuries['player_id'].nunique()} players")

    print("Loading match_stats.csv for reference dates...")
    matches = pd.read_csv(MATCH_STATS_CSV, parse_dates=["date"])
    print(f"  {matches['player_id'].nunique()} players, {matches['fixture_id'].nunique()} fixtures")

    # Get unique (player_id, date, fixture_id) combinations as reference points
    ref_points = matches[["player_id", "fixture_id", "date"]].drop_duplicates()

    rows   = []
    total  = ref_points["player_id"].nunique()
    done   = 0

    print(f"\nComputing injury features for {total} players...")

    for player_id, group in ref_points.groupby("player_id"):
        player_injuries = injuries[injuries["player_id"] == player_id]

        done += 1
        if done % 100 == 0:
            print(f"  {done}/{total}...")

        for _, ref_row in group.iterrows():
            features = compute_injury_features(player_injuries, ref_row["date"])
            rows.append({
                "player_id":  player_id,
                "fixture_id": ref_row["fixture_id"],
                "date":       ref_row["date"],
                **features,
            })

    out = pd.DataFrame(rows)
    out = out.sort_values(["player_id", "date"]).reset_index(drop=True)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT_FILE, index=False)

    print(f"\n{'─'*50}")
    print(f"Rows:                       {len(out)}")
    print(f"Players:                    {out['player_id'].nunique()}")
    print(f"Players with injuries:      {(out['career_total_injuries'] > 0).sum()}")

    print(f"\nCareer injury stats:")
    print(f"  Avg injuries per player:  {out.groupby('player_id')['career_total_injuries'].max().mean():.1f}")
    print(f"  Max career injuries:      {out['career_total_injuries'].max()}")
    print(f"  Recurring injury flag:    {out['recurring_injury_flag'].sum()} rows")
    print(f"  Recently returned:        {out['is_recently_returned'].sum()} rows")

    print(f"\nSaved: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
