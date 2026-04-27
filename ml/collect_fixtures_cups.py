"""
Collect completed fixture lists for cup + European competitions.

Competitions: FA Cup (45), EFL Cup (48), UCL (2), UEL (3), UECL (848)
Seasons:      ALL_SEASONS (2022, 2023, 2024, 2025)

Endpoint: GET /fixtures?league={id}&season={year}&status=FT
Calls:    1 per (league, season) → ~20 total

Output: data/raw/fixtures_{league}_{season}.json per combination
"""

import json
import time
import requests
from config import (
    HEADERS, BASE_URL, ALL_SEASONS, DELAY,
    RAW_DIR, PROGRESS_FILE,
    CUP_LEAGUES, cup_fixtures_file,
)


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def fetch_fixtures(league_id: int, league_name: str, season: int, progress: dict) -> list:
    key = f"fixtures_{league_id}_{season}_done"

    if progress.get(key):
        path = cup_fixtures_file(league_id, season)
        if path.exists():
            with open(path) as f:
                fixtures = json.load(f)
            print(f"  {league_name} {season}: already fetched ({len(fixtures)} fixtures), skipping.")
            return fixtures

    print(f"  {league_name} {season}: fetching ...", end=" ", flush=True)

    resp = requests.get(
        f"{BASE_URL}/fixtures",
        headers=HEADERS,
        params={"league": league_id, "season": season, "status": "FT"},
    )
    resp.raise_for_status()
    data = resp.json()

    errors = data.get("errors")
    if errors and (isinstance(errors, dict) and errors or isinstance(errors, list) and errors):
        print(f"API error: {errors}")
        return []

    fixtures = data.get("response", [])
    print(f"{len(fixtures)} fixtures")

    path = cup_fixtures_file(league_id, season)
    with open(path, "w") as f:
        json.dump(fixtures, f, indent=2)

    progress[key] = True
    save_progress(progress)

    return fixtures


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    progress = load_progress()

    total_combinations = len(CUP_LEAGUES) * len(ALL_SEASONS)
    print(f"Fetching fixture lists for {len(CUP_LEAGUES)} competitions × {len(ALL_SEASONS)} seasons "
          f"= {total_combinations} API calls\n")

    call_count = 0
    for league_id, league_name in CUP_LEAGUES.items():
        print(f"\n── {league_name} (league {league_id}) ──────────────────")
        for season in ALL_SEASONS:
            fixtures = fetch_fixtures(league_id, league_name, season, progress)

            if fixtures:
                teams = set()
                for fix in fixtures:
                    teams.add(fix["teams"]["home"]["name"])
                    teams.add(fix["teams"]["away"]["name"])
                dates = sorted(f["fixture"]["date"][:10] for f in fixtures)
                print(f"    Teams: {len(teams)}, Dates: {dates[0]} → {dates[-1]}")

            call_count += 1
            if call_count < total_combinations:
                time.sleep(DELAY)

    print(f"\n{'─'*50}")
    print("Done. Next step: python3.14 collect_match_stats_cups.py")


if __name__ == "__main__":
    main()
