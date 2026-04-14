"""
Step 2.2 — Build season_stats.csv

One row per player per season from players_season_stats.json.
Output: data/season_stats.csv
"""

import json
import pandas as pd
from config import PLAYERS_FILE, SEASON_STATS_CSV


def safe(val, cast=None):
    if val is None:
        return None
    try:
        return cast(val) if cast else val
    except (ValueError, TypeError):
        return None


def main():
    print("Loading players_season_stats.json...")
    with open(PLAYERS_FILE) as f:
        raw = json.load(f)
    print(f"  {len(raw)} raw entries")

    rows = []

    for entry in raw:
        pid = entry.get("player", {}).get("id")
        if not pid:
            continue

        for stat in entry.get("statistics", []):
            league = stat.get("league", {})
            if league.get("id") != 39:   # Premier League only
                continue

            team    = stat.get("team", {})
            games   = stat.get("games", {})
            subs    = stat.get("substitutes", {})
            shots   = stat.get("shots", {})
            goals   = stat.get("goals", {})
            passes  = stat.get("passes", {})
            tackles = stat.get("tackles", {})
            duels   = stat.get("duels", {})
            drib    = stat.get("dribbles", {})
            fouls   = stat.get("fouls", {})
            cards   = stat.get("cards", {})
            penalty = stat.get("penalty", {})

            rows.append({
                "player_id":          pid,
                "season":             league.get("season"),
                "team":               team.get("name"),
                "team_id":            team.get("id"),
                # Games
                "appearances":        safe(games.get("appearences"), int),
                "lineups":            safe(games.get("lineups"), int),
                "minutes":            safe(games.get("minutes"), int),
                "rating":             safe(games.get("rating"), float),
                "captain":            games.get("captain"),
                # Substitutes
                "subs_in":            safe(subs.get("in"), int),
                "subs_out":           safe(subs.get("out"), int),
                "subs_bench":         safe(subs.get("bench"), int),
                # Shots
                "shots_total":        safe(shots.get("total"), int),
                "shots_on":           safe(shots.get("on"), int),
                # Goals
                "goals":              safe(goals.get("total"), int),
                "goals_conceded":     safe(goals.get("conceded"), int),
                "assists":            safe(goals.get("assists"), int),
                "saves":              safe(goals.get("saves"), int),
                # Passes
                "passes_total":       safe(passes.get("total"), int),
                "passes_key":         safe(passes.get("key"), int),
                "passes_accuracy":    safe(passes.get("accuracy"), float),
                # Tackles
                "tackles":            safe(tackles.get("total"), int),
                "blocks":             safe(tackles.get("blocks"), int),
                "interceptions":      safe(tackles.get("interceptions"), int),
                # Duels
                "duels_total":        safe(duels.get("total"), int),
                "duels_won":          safe(duels.get("won"), int),
                # Dribbles
                "dribbles_attempts":  safe(drib.get("attempts"), int),
                "dribbles_success":   safe(drib.get("success"), int),
                "dribbles_past":      safe(drib.get("past"), int),
                # Fouls
                "fouls_drawn":        safe(fouls.get("drawn"), int),
                "fouls_committed":    safe(fouls.get("committed"), int),
                # Cards
                "yellow_cards":       safe(cards.get("yellow"), int),
                "yellowred_cards":    safe(cards.get("yellowred"), int),
                "red_cards":          safe(cards.get("red"), int),
                # Penalties
                "penalty_won":        safe(penalty.get("won"), int),
                "penalty_committed":  safe(penalty.get("commited"), int),
                "penalty_scored":     safe(penalty.get("scored"), int),
                "penalty_missed":     safe(penalty.get("missed"), int),
                "penalty_saved":      safe(penalty.get("saved"), int),
            })

    df = pd.DataFrame(rows)
    df = df.sort_values(["player_id", "season"]).reset_index(drop=True)

    SEASON_STATS_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(SEASON_STATS_CSV, index=False)

    print(f"\n{'─'*50}")
    print(f"Total rows:        {len(df)}")
    print(f"Seasons:           {sorted(df['season'].dropna().unique().astype(int).tolist())}")
    print(f"Unique players:    {df['player_id'].nunique()}")
    print(f"Teams:             {df['team'].nunique()}")
    print(f"\nRows per season:")
    for season, count in df.groupby("season").size().items():
        print(f"  {int(season)}: {count} players")
    print(f"\nSaved: {SEASON_STATS_CSV}")


if __name__ == "__main__":
    main()
