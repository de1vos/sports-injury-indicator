"""
Collect per-match player stats for historical seasons (2022, 2023, 2024).

Endpoint: GET /fixtures/players?fixture={id}
Calls:    ~380 per season (~1,140 total)
Output:   data/raw/match_stats_{season}.json per season
"""

import json
import time
import requests
from config import (
    HEADERS, BASE_URL, DELAY, RAW_DIR,
    HISTORICAL_SEASONS, PROGRESS_FILE,
    fixtures_file, match_stats_file,
)


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def load_season_stats(season: int) -> dict:
    path = match_stats_file(season)
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


def save_season_stats(season: int, data: dict):
    with open(match_stats_file(season), "w") as f:
        json.dump(data, f, indent=2)


def collect_season(season: int, progress: dict):
    fixtures_path = fixtures_file(season)
    if not fixtures_path.exists():
        print(f"  Season {season}: fixtures_{season}.json not found — run collect_fixtures_historical.py first.")
        return

    with open(fixtures_path) as f:
        fixtures = json.load(f)

    progress_key = f"match_stats_{season}_done"
    done         = set(progress.get(progress_key, []))
    match_stats  = load_season_stats(season)

    total     = len(fixtures)
    remaining = total - len(done)
    fetched   = 0
    errors    = 0

    print(f"\n── Season {season} ─────────────────────────────────────")
    print(f"  Fixtures: {total}  |  Already fetched: {len(done)}  |  Remaining: {remaining}")

    for i, fix in enumerate(fixtures, 1):
        fixture_id  = str(fix["fixture"]["id"])
        date        = fix["fixture"]["date"][:10]
        home        = fix["teams"]["home"]["name"]
        away        = fix["teams"]["away"]["name"]

        if fixture_id in done:
            continue

        print(f"  [{i}/{total}] {date} {home} vs {away} ...", end=" ", flush=True)

        resp = requests.get(
            f"{BASE_URL}/fixtures/players",
            headers=HEADERS,
            params={"fixture": fixture_id},
        )
        resp.raise_for_status()
        data = resp.json()

        api_errors = data.get("errors")
        if api_errors and (isinstance(api_errors, dict) and api_errors or isinstance(api_errors, list) and api_errors):
            print(f"API error: {api_errors}")
            errors += 1
            time.sleep(DELAY)
            continue

        response      = data.get("response", [])
        total_players = sum(len(team.get("players", [])) for team in response)

        match_stats[fixture_id] = {
            "fixture_id": int(fixture_id),
            "date":       fix["fixture"]["date"],
            "round":      fix["league"]["round"],
            "home_team":  fix["teams"]["home"]["name"],
            "away_team":  fix["teams"]["away"]["name"],
            "score":      fix["goals"],
            "teams":      response,
        }

        done.add(fixture_id)
        fetched += 1
        progress[progress_key] = list(done)

        # Save every 50 fixtures to avoid losing progress
        if fetched % 50 == 0:
            save_season_stats(season, match_stats)
            save_progress(progress)

        print(f"{total_players} players")
        time.sleep(DELAY)

    # Final save
    save_season_stats(season, match_stats)
    save_progress(progress)

    print(f"  Season {season} done — fetched: {fetched}, errors: {errors}, total in file: {len(match_stats)}")


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    progress = load_progress()

    total_calls = sum(
        len(json.load(open(fixtures_file(s)))) - len(progress.get(f"match_stats_{s}_done", []))
        for s in HISTORICAL_SEASONS
        if fixtures_file(s).exists()
    )
    print(f"Estimated remaining API calls: ~{total_calls}")
    print(f"Estimated time at 0.5s/call:   ~{total_calls * 0.5 / 60:.0f} min\n")

    for season in HISTORICAL_SEASONS:
        collect_season(season, progress)

    print(f"\n{'─'*50}")
    print("All historical seasons collected.")
    print("Next step: python3.14 build_match_stats.py")


if __name__ == "__main__":
    main()
