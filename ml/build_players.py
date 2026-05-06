"""
Step 2.1 — Build players.csv

Reads raw players_season_stats.json and squads.json.
Deduplicates by player_id (latest season wins).
Joins kit number from squads.
Output: data/players.csv
"""

import json
import pandas as pd
from config import PLAYERS_FILE, SQUADS_FILE, PLAYERS_CSV, ALL_SEASONS, LEAGUE


def parse_height(h) -> float | None:
    """'178 cm' → 178.0"""
    try:
        return float(str(h).replace("cm", "").strip())
    except (ValueError, TypeError):
        return None


def parse_weight(w) -> float | None:
    """'72 kg' → 72.0"""
    try:
        return float(str(w).replace("kg", "").strip())
    except (ValueError, TypeError):
        return None


def main():
    # ── Load raw data ─────────────────────────────────────────────────────────
    print("Loading players_season_stats.json...")
    with open(PLAYERS_FILE) as f:
        raw = json.load(f)
    print(f"  {len(raw)} raw entries")

    # ── Load squads for kit numbers ───────────────────────────────────────────
    kit_numbers = {}   # player_id → kit number
    if SQUADS_FILE.exists():
        print("Loading squads.json...")
        with open(SQUADS_FILE) as f:
            squads = json.load(f)
        for team_data in squads.values():
            for p in team_data.get("players", []):
                pid = p.get("id")
                num = p.get("number")
                if pid and num is not None:
                    kit_numbers[pid] = num
        print(f"  Kit numbers found: {len(kit_numbers)}")
    else:
        print("squads.json not found — kit_number will be null.")

    # ── Build one record per player, latest season wins ───────────────────────
    # Sort seasons so the last one processed is the most recent
    season_order = {s: i for i, s in enumerate(sorted(ALL_SEASONS))}
    players = {}  # player_id → record

    for entry in raw:
        p    = entry.get("player", {})
        pid  = p.get("id")
        if not pid:
            continue

        stats = entry.get("statistics", [])
        if not stats:
            continue

        # Filter to Premier League only — API returns all leagues a player appeared in,
        # so a Liverpool→Atalanta loanee would otherwise be tagged with their Atalanta team.
        pl_stats = [s for s in stats if s.get("league", {}).get("id") == LEAGUE]
        if not pl_stats:
            continue

        # Pick the most recent PL stat block; use list position as tiebreaker so
        # mid-season transfers resolve to the destination club (API returns chronologically).
        stat = max(
            enumerate(pl_stats),
            key=lambda x: (
                season_order.get(x[1].get("league", {}).get("season", 0), 0),
                x[0],
            ),
        )[1]

        season = stat.get("league", {}).get("season")

        record = {
            "player_id":    pid,
            "name":         p.get("name"),
            "firstname":    p.get("firstname"),
            "lastname":     p.get("lastname"),
            "photo":        p.get("photo"),
            "dob":          p.get("birth", {}).get("date"),
            "age":          p.get("age"),
            "nationality":  p.get("nationality"),
            "height":       parse_height(p.get("height")),
            "weight":       parse_weight(p.get("weight")),
            "position":     stat.get("games", {}).get("position"),
            "current_team": stat.get("team", {}).get("name"),
            "team_id":      stat.get("team", {}).get("id"),
            "team_logo":    stat.get("team", {}).get("logo"),
            "last_season":  season,
        }

        # Keep this entry if we haven't seen this player yet,
        # or if this season is more recent than what we have
        existing = players.get(pid)
        if existing is None or season_order.get(season, 0) > season_order.get(existing["last_season"], 0):
            players[pid] = record

    print(f"\n  Unique players after dedup: {len(players)}")

    # ── Build DataFrame ───────────────────────────────────────────────────────
    df = pd.DataFrame(list(players.values()))

    # Join kit numbers
    df["kit_number"] = df["player_id"].map(kit_numbers)

    # Clean up
    df = df.sort_values("name").reset_index(drop=True)

    # ── Save ──────────────────────────────────────────────────────────────────
    PLAYERS_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(PLAYERS_CSV, index=False)
    print(f"  Saved: {PLAYERS_CSV}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'─'*50}")
    print(f"Total players:     {len(df)}")
    print(f"Teams:             {df['current_team'].nunique()}")
    print(f"With kit number:   {df['kit_number'].notna().sum()}")
    print(f"Positions:         {df['position'].value_counts().to_dict()}")
    print(f"Age range:         {df['age'].min():.0f} – {df['age'].max():.0f}")
    print(f"Null counts:\n{df.isnull().sum()[df.isnull().sum() > 0]}")
    print(f"\nSample rows:")
    print(df[["player_id", "name", "current_team", "position", "age", "kit_number"]].head(10).to_string(index=False))


if __name__ == "__main__":
    main()
