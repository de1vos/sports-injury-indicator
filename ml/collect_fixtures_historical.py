"""
Collect completed fixture IDs for historical seasons (2022, 2023, 2024).

Endpoint: GET /fixtures?league=39&season={year}&status=FT
Calls:    1 per season (~3 total)
Output:   data/raw/fixtures_{season}.json per season
"""

import json
import time
import requests
from config import HEADERS, BASE_URL, LEAGUE, HISTORICAL_SEASONS, DELAY, RAW_DIR, PROGRESS_FILE, fixtures_file


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def fetch_fixtures_for_season(season: int, progress: dict) -> list:
    key = f"fixtures_{season}_done"

    if progress.get(key):
        path = fixtures_file(season)
        with open(path) as f:
            fixtures = json.load(f)
        print(f"  {season}: already fetched ({len(fixtures)} fixtures), skipping.")
        return fixtures

    print(f"  {season}: fetching ...", end=" ", flush=True)

    resp = requests.get(
        f"{BASE_URL}/fixtures",
        headers=HEADERS,
        params={"league": LEAGUE, "season": season, "status": "FT"},
    )
    resp.raise_for_status()
    data = resp.json()

    errors = data.get("errors")
    if errors and (isinstance(errors, dict) and errors or isinstance(errors, list) and errors):
        print(f"API error: {errors}")
        return []

    fixtures = data.get("response", [])
    print(f"{len(fixtures)} fixtures")

    path = fixtures_file(season)
    with open(path, "w") as f:
        json.dump(fixtures, f, indent=2)

    progress[key] = True
    save_progress(progress)

    return fixtures


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    progress = load_progress()

    print(f"Fetching historical fixtures for seasons: {HISTORICAL_SEASONS}\n")

    for i, season in enumerate(HISTORICAL_SEASONS):
        fixtures = fetch_fixtures_for_season(season, progress)

        if fixtures:
            teams = set()
            for fix in fixtures:
                teams.add(fix["teams"]["home"]["name"])
                teams.add(fix["teams"]["away"]["name"])
            dates = [f["fixture"]["date"][:10] for f in fixtures]
            print(f"    Teams: {len(teams)}, Dates: {dates[0]} → {dates[-1]}")

        if i < len(HISTORICAL_SEASONS) - 1:
            time.sleep(DELAY)

    print("\nDone.")


if __name__ == "__main__":
    main()
