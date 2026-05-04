"""
Step 3.1 — Rolling match features

For each player at each match date, compute backwards-looking
workload and intensity features from match_stats.csv.

Output: data/rolling_features.csv — one row per player per match
"""

import json
import numpy as np
import pandas as pd
from config import MATCH_STATS_CSV, DATA_DIR, INTL_BREAK_WINDOWS, RAW_DIR


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


def days_since_last_break_end(ref_date):
    """Days since the most recent international break ended before ref_date.
    Returns 365 if no break has occurred yet in the calendar."""
    past_ends = [
        pd.Timestamp(end)
        for (_, end) in INTL_BREAK_WINDOWS
        if pd.Timestamp(end) < ref_date
    ]
    if not past_ends:
        return 365
    return (ref_date - max(past_ends)).days


def in_recent_intl_break(ref_date, lookback_days=14):
    """Returns 1 if any break window ended within lookback_days before ref_date."""
    window_start = ref_date - pd.Timedelta(days=lookback_days)
    for (_, end) in INTL_BREAK_WINDOWS:
        end_ts = pd.Timestamp(end)
        if window_start <= end_ts < ref_date:
            return 1
    return 0


def build_team_schedule(df_matches):
    """Builds a DataFrame of all known fixtures (team, date) from history and upcoming."""
    hist = df_matches[["team", "date"]].drop_duplicates().copy()
    
    upcoming_file = RAW_DIR / "fixtures_upcoming.json"
    upcoming_rows = []
    if upcoming_file.exists():
        with open(upcoming_file) as f:
            fixtures = json.load(f)
            for fix in fixtures:
                date_str = fix["fixture"]["date"]
                home = fix["teams"]["home"]["name"]
                away = fix["teams"]["away"]["name"]
                upcoming_rows.append({"team": home, "date": date_str})
                upcoming_rows.append({"team": away, "date": date_str})
    
    if upcoming_rows:
        up_df = pd.DataFrame(upcoming_rows)
        up_df["date"] = pd.to_datetime(up_df["date"], utc=True).dt.tz_localize(None)
        hist["date"] = pd.to_datetime(hist["date"]).dt.tz_localize(None)
        sched = pd.concat([hist, up_df]).drop_duplicates()
    else:
        sched = hist
        
    return sched.sort_values(["team", "date"])


def compute_features(df_player, ref_date, df_schedule, team):
    """Compute all rolling features for one player at one reference date."""

    w7   = rolling_window(df_player, ref_date, 7)
    w14  = rolling_window(df_player, ref_date, 14)
    w28  = rolling_window(df_player, ref_date, 28)
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
    minutes_28d = w28["minutes"].sum()
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
    # Acute  = total minutes in the last 7 days
    # Chronic = average weekly load over the last 28 days (28d / 4 weeks)
    # Standard clinical formula — using 28d window avoids the 60d dilution.
    avg_weekly_28d = minutes_28d / 4 if minutes_28d > 0 else None
    if avg_weekly_28d and avg_weekly_28d > 0:
        acwr = minutes_7d / avg_weekly_28d
    else:
        acwr = None

    is_acwr_danger_zone = int(acwr > 1.5) if acwr is not None else 0

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



    # ── Consecutive 90-min starts ────────────────────────────────────────────
    sorted_past = df_player[df_player["date"] < ref_date].sort_values("date", ascending=False)
    consecutive_90 = 0
    for _, row in sorted_past.iterrows():
        if (row["minutes"] or 0) >= 90:
            consecutive_90 += 1
        else:
            break

    # ── Upcoming matches next 14d ────────────────────────────────────────────
    future_cutoff = ref_date + pd.Timedelta(days=14)
    team_matches = df_schedule[(df_schedule["team"] == team) & 
                               (df_schedule["date"] > ref_date) & 
                               (df_schedule["date"] <= future_cutoff)]
    upcoming_matches_next_14d = len(team_matches)

    # ── Match density 14d ────────────────────────────────────────────────────
    match_density_14d = matches_14d

    # ── International break features ─────────────────────────────────────────
    # Players returning from international duty have elevated injury risk.
    # PL data has no international minutes, so we use the break calendar.
    days_since_break  = days_since_last_break_end(ref_date)
    in_break_window   = in_recent_intl_break(ref_date, lookback_days=14)
    # Long gap (12+ days) between PL fixtures implies a break, rotation, or illness
    long_gap_before   = 1 if (days_since_last is not None and days_since_last >= 12) else 0

    return {
        "minutes_last_7d":             int(minutes_7d),
        "minutes_last_30d":            int(minutes_30d),
        "matches_last_14d":            matches_14d,
        "matches_last_30d":            matches_30d,
        "days_since_last_match":       days_since_last,
        "avg_minutes_per_match_30d":   avg_min_30d,
        "workload_trend":              workload_trend,
        "acute_chronic_ratio":         acwr,
        "is_acwr_danger_zone":         is_acwr_danger_zone,
        "match_density_14d":           match_density_14d,
        "upcoming_matches_next_14d":   upcoming_matches_next_14d,
        "duels_per_90_rolling":        duels_per_90_l5,
        "tackles_per_90_rolling":      tackles_per_90_l5,
        "dribbles_per_90_rolling":     dribbles_per_90_l5,
        "fouls_committed_per_90_rolling": fouls_comm_per_90,
        "fouls_against_per_90_rolling":   fouls_drawn_per_90,
        "consecutive_90min_starts":    consecutive_90,
        "days_since_intl_break":       days_since_break,
        "in_intl_break_window":        in_break_window,
        "long_gap_before_match":       long_gap_before,
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

    print("Building team schedule...")
    df_schedule = build_team_schedule(df)

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
            team = match_row["team"]
            features = compute_features(df_player, ref_date, df_schedule, team)

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
