"""
Step 1.3 — Collect completed fixture IDs for the 2025/26 season.

Endpoint: GET /fixtures?league=39&season=2025&status=FT
Output:   data/raw/fixtures_2025.json
Calls:    ~6
"""

import json
import requests
from config import HEADERS, BASE_URL, LEAGUE, CURRENT_SEASON, DELAY, RAW_DIR, FIXTURES_FILE, PROGRESS_FILE


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    progress = load_progress()

    if progress.get("fixtures_2025_done"):
        print("Fixtures already fetched. Delete 'fixtures_2025_done' from progress.json to re-fetch.")
        with open(FIXTURES_FILE) as f:
            fixtures = json.load(f)
        print(f"Loaded {len(fixtures)} fixtures from cache.")
        return

    print(f"Fetching completed fixtures for season {CURRENT_SEASON}...")

    print(f"  Fetching ...", end=" ", flush=True)
    resp = requests.get(
        f"{BASE_URL}/fixtures",
        headers=HEADERS,
        params={
            "league": LEAGUE,
            "season": CURRENT_SEASON,
            "status": "FT",
        },
    )
    resp.raise_for_status()
    data = resp.json()

    errors = data.get("errors")
    if errors and (isinstance(errors, dict) and errors or isinstance(errors, list) and errors):
        print(f"API error: {errors}")
        return

    all_fixtures = data.get("response", [])
    print(f"{len(all_fixtures)} fixtures")

    # Save
    with open(FIXTURES_FILE, "w") as f:
        json.dump(all_fixtures, f, indent=2)

    progress["fixtures_2025_done"] = True
    save_progress(progress)

    print(f"\nDone. {len(all_fixtures)} completed fixtures saved to {FIXTURES_FILE}")

    # Quick summary
    teams = set()
    rounds = set()
    for fix in all_fixtures:
        teams.add(fix["teams"]["home"]["name"])
        teams.add(fix["teams"]["away"]["name"])
        rounds.add(fix["league"]["round"])

    print(f"Teams:  {len(teams)}")
    print(f"Rounds: {len(rounds)}")
    if all_fixtures:
        print(f"Dates:  {all_fixtures[0]['fixture']['date'][:10]} → {all_fixtures[-1]['fixture']['date'][:10]}")


if __name__ == "__main__":
    main()
