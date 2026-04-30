"""
Step 3.2 — Season comparison features

Compares each player's current season (2025) per-90 rates
against their previous season to detect workload spikes.

Output: data/season_features.csv — one row per player
"""

import numpy as np
import pandas as pd
from config import SEASON_STATS_CSV, CURRENT_SEASON, DATA_DIR

OUTPUT_FILE = DATA_DIR / "season_features.csv"

TOTAL_MATCHES = 38  # full PL season


def per_90(stat, minutes):
    """Return stat per 90 minutes, or NaN if not enough data."""
    if minutes and minutes > 0:
        return stat / minutes * 90
    return np.nan


def main():
    print("Loading season_stats.csv...")
    df = pd.read_csv(SEASON_STATS_CSV)
    print(f"  {len(df)} rows across seasons: {sorted(df['season'].dropna().unique().astype(int).tolist())}")

    all_seasons = sorted(df["season"].dropna().unique().astype(int).tolist())
    all_rows = []

    for current_season in all_seasons:
        prev_season = current_season - 1
        current = df[df["season"] == current_season].copy()
        prev    = df[df["season"] == prev_season].copy()

        print(f"  Season {current_season}: {len(current)} players  (prev: {len(prev)})")

        for _, row in current.iterrows():
            pid         = row["player_id"]
            appearances = row.get("appearances") or 0
            minutes     = row.get("minutes") or 0

            matches_so_far = max(appearances, 1)

            # ── Current season per-90 rates ───────────────────────────────────
            curr_duels_per_90   = per_90(row.get("duels_total") or 0, minutes)
            curr_tackles_per_90 = per_90(row.get("tackles") or 0, minutes)
            curr_fouls_per_90   = per_90(row.get("fouls_committed") or 0, minutes)

            # ── Previous season per-90 rates ──────────────────────────────────
            prev_row = prev[prev["player_id"] == pid]

            if not prev_row.empty:
                p          = prev_row.iloc[0]
                prev_min   = p.get("minutes") or 0
                prev_duels_per_90   = per_90(p.get("duels_total") or 0, prev_min)
                prev_tackles_per_90 = per_90(p.get("tackles") or 0, prev_min)
                prev_fouls_per_90   = per_90(p.get("fouls_committed") or 0, prev_min)
                prev_appearances    = p.get("appearances") or 0

                minutes_vs_last = (minutes / prev_min) if prev_min > 0 else np.nan
                duels_vs_last   = (
                    curr_duels_per_90 / prev_duels_per_90
                    if prev_duels_per_90 and prev_duels_per_90 > 0
                    else np.nan
                )
            else:
                prev_appearances    = np.nan
                minutes_vs_last     = np.nan
                duels_vs_last       = np.nan
                prev_tackles_per_90 = np.nan
                prev_fouls_per_90   = np.nan
                prev_duels_per_90   = np.nan

            # ── Appearances pace ──────────────────────────────────────────────
            if appearances > 0:
                gws_elapsed = current["appearances"].max()
                gws_elapsed = max(gws_elapsed, 1)
                appearances_pace = (appearances / gws_elapsed) * TOTAL_MATCHES
            else:
                appearances_pace = np.nan

            all_rows.append({
                "player_id":              pid,
                "season":                 current_season,
                "appearances":            appearances,
                "minutes":                minutes,
                "duels_per_90_current":   curr_duels_per_90,
                "tackles_per_90_current": curr_tackles_per_90,
                "fouls_per_90_current":   curr_fouls_per_90,
                "duels_per_90_prev":      prev_duels_per_90 if not prev_row.empty else np.nan,
                "tackles_per_90_prev":    prev_tackles_per_90,
                "fouls_per_90_prev":      prev_fouls_per_90,
                "minutes_vs_last_season": minutes_vs_last,
                "duels_per_90_vs_last_season": duels_vs_last,
                "appearances_pace":       appearances_pace,
                "prev_season_appearances": prev_appearances,
            })

    out = pd.DataFrame(all_rows)
    out = out.sort_values(["season", "player_id"]).reset_index(drop=True)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT_FILE, index=False)

    print(f"\n{'─'*50}")
    print(f"Total rows:                 {len(out)}")
    print(f"Seasons covered:            {sorted(out['season'].unique().tolist())}")
    print(f"With prev season data:      {out['minutes_vs_last_season'].notna().sum()}")
    print(f"Without prev season data:   {out['minutes_vs_last_season'].isna().sum()}")

    print(f"\nWorkload vs last season (minutes ratio):")
    print(f"  Mean:  {out['minutes_vs_last_season'].mean():.2f}")
    print(f"  >1.2 (higher load): {(out['minutes_vs_last_season'] > 1.2).sum()} players")
    print(f"  <0.8 (lower load):  {(out['minutes_vs_last_season'] < 0.8).sum()} players")

    print(f"\nSaved: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
