"""
Step 2.3 — Build match_stats.csv

Reads match stats for all seasons (PL + cup/Euro competitions) and combines
into one CSV. One row per player per match, with 'season' and 'competition' columns.

PL source files:   data/raw/match_stats_{season}.json
Cup source files:  data/raw/match_stats_{league}_{season}.json

Output: data/match_stats.csv
"""

import json
from pathlib import Path
import pandas as pd
from config import (
    ALL_SEASONS, MATCH_STATS_CSV,
    match_stats_file, CUP_LEAGUES, cup_match_stats_file,
)


def safe(val, cast=None):
    if val is None:
        return None
    try:
        return cast(val) if cast else val
    except (ValueError, TypeError):
        return None


def parse_season_from_path(path: Path, season: int, competition: str = "PL") -> list[dict]:
    """Parse a match_stats JSON file into rows. Works for both PL and cup files."""
    if not path.exists():
        print(f"  {competition} {season}: file not found, skipping.")
        return []

    with open(path) as f:
        raw = json.load(f)

    print(f"  {competition} {season}: {len(raw)} fixtures ...", end=" ", flush=True)
    rows = []

    for fixture_id, fixture in raw.items():
        date      = fixture.get("date", "")[:10]
        round_    = fixture.get("round", "")
        home_team = fixture.get("home_team", "")
        away_team = fixture.get("away_team", "")

        for team_block in fixture.get("teams", []):
            team_name = team_block.get("team", {}).get("name", "")
            opponent  = away_team if team_name == home_team else home_team
            home_away = "home" if team_name == home_team else "away"

            for player_block in team_block.get("players", []):
                p   = player_block.get("player", {})
                pid = p.get("id")
                if not pid:
                    continue

                stats   = player_block.get("statistics", [{}])[0]
                games   = stats.get("games", {})
                shots   = stats.get("shots", {})
                goals   = stats.get("goals", {})
                passes  = stats.get("passes", {})
                tackles = stats.get("tackles", {})
                duels   = stats.get("duels", {})
                drib    = stats.get("dribbles", {})
                fouls   = stats.get("fouls", {})
                cards   = stats.get("cards", {})
                penalty = stats.get("penalty", {})

                rows.append({
                    "player_id":         pid,
                    "player_name":       p.get("name"),
                    "fixture_id":        int(fixture_id),
                    "season":            season,
                    "competition":       competition,
                    "date":              date,
                    "round":             round_,
                    "team":              team_name,
                    "opponent":          opponent,
                    "home_away":         home_away,
                    "minutes":           safe(games.get("minutes"), int),
                    "rating":            safe(games.get("rating"), float),
                    "position":          games.get("position"),
                    "captain":           games.get("captain"),
                    "shots_total":       safe(shots.get("total"), int),
                    "shots_on":          safe(shots.get("on"), int),
                    "goals":             safe(goals.get("total"), int),
                    "assists":           safe(goals.get("assists"), int),
                    "goals_conceded":    safe(goals.get("conceded"), int),
                    "saves":             safe(goals.get("saves"), int),
                    "passes_total":      safe(passes.get("total"), int),
                    "passes_key":        safe(passes.get("key"), int),
                    "passes_accuracy":   safe(passes.get("accuracy"), float),
                    "tackles":           safe(tackles.get("total"), int),
                    "blocks":            safe(tackles.get("blocks"), int),
                    "interceptions":     safe(tackles.get("interceptions"), int),
                    "duels_total":       safe(duels.get("total"), int),
                    "duels_won":         safe(duels.get("won"), int),
                    "dribbles_attempts": safe(drib.get("attempts"), int),
                    "dribbles_success":  safe(drib.get("success"), int),
                    "dribbles_past":     safe(drib.get("past"), int),
                    "fouls_drawn":       safe(fouls.get("drawn"), int),
                    "fouls_committed":   safe(fouls.get("committed"), int),
                    "yellow_cards":      safe(cards.get("yellow"), int),
                    "red_cards":         safe(cards.get("red"), int),
                    "penalty_won":       safe(penalty.get("won"), int),
                    "penalty_committed": safe(penalty.get("commited"), int),
                    "penalty_scored":    safe(penalty.get("scored"), int),
                    "penalty_missed":    safe(penalty.get("missed"), int),
                })

    print(f"{len(rows)} rows")
    return rows


def main():
    print("Building match_stats.csv from all seasons + competitions...\n")

    all_rows = []

    # ── Premier League ────────────────────────────────────────────────────────
    print("Premier League:")
    for season in ALL_SEASONS:
        all_rows.extend(parse_season_from_path(match_stats_file(season), season, "PL"))

    # ── Cup + European competitions ───────────────────────────────────────────
    cup_files_found = sum(
        1 for league_id in CUP_LEAGUES for season in ALL_SEASONS
        if cup_match_stats_file(league_id, season).exists()
    )

    if cup_files_found == 0:
        print("\nNo cup/Euro files found — skipping. Run collect_match_stats_cups.py first.")
    else:
        print(f"\nCup / European competitions ({cup_files_found} files found):")
        for league_id, league_name in CUP_LEAGUES.items():
            for season in ALL_SEASONS:
                path = cup_match_stats_file(league_id, season)
                all_rows.extend(parse_season_from_path(path, season, league_name))

    df = pd.DataFrame(all_rows)
    df["date"] = pd.to_datetime(df["date"])

    # Deduplicate — safety net in case of re-fetch overlaps
    before = len(df)
    df = df.drop_duplicates(subset=["player_id", "fixture_id"], keep="first")
    dropped = before - len(df)
    if dropped:
        print(f"\nDropped {dropped} duplicate player-fixture rows.")

    df = df.sort_values(["season", "date", "fixture_id", "player_id"]).reset_index(drop=True)

    MATCH_STATS_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(MATCH_STATS_CSV, index=False)

    print(f"\n{'─'*50}")
    print(f"Total rows:        {len(df)}")
    print(f"\nRows per season:")
    for season, count in df.groupby("season").size().items():
        print(f"  {int(season)}: {count}")
    if "competition" in df.columns:
        print(f"\nRows per competition:")
        for comp, count in df.groupby("competition").size().sort_values(ascending=False).items():
            print(f"  {comp}: {count}")
    print(f"\nUnique fixtures:   {df['fixture_id'].nunique()}")
    print(f"Unique players:    {df['player_id'].nunique()}")
    print(f"Avg matches/player/season: "
          f"{df.groupby(['player_id','season']).size().mean():.1f}")
    print(f"Date range:        {df['date'].min().date()} → {df['date'].max().date()}")
    print(f"\nSaved: {MATCH_STATS_CSV}")


if __name__ == "__main__":
    main()
