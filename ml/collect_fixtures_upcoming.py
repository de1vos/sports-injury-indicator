"""
Step 1.6 — Collect upcoming fixtures for the 2025/26 season.

Endpoint: GET /fixtures?league=39&season=2025&status=NS
Calls:    1
Output:   data/raw/fixtures_upcoming.json
"""

import json
import requests
from config import HEADERS, BASE_URL, LEAGUE, CURRENT_SEASON, RAW_DIR, FIXTURES_UPCOMING_FILE, PROGRESS_FILE


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cached")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    progress = load_progress()

    if progress.get("fixtures_upcoming_done") and not args.force:
        print("Upcoming fixtures already fetched. Use --force to re-fetch.")
        with open(FIXTURES_UPCOMING_FILE) as f:
            fixtures = json.load(f)
        print(f"Loaded {len(fixtures)} upcoming fixtures from cache.")
        return

    print(f"Fetching upcoming fixtures for season {CURRENT_SEASON}...")
    print(f"  Fetching ...", end=" ", flush=True)

    resp = requests.get(
        f"{BASE_URL}/fixtures",
        headers=HEADERS,
        params={
            "league": LEAGUE,
            "season": CURRENT_SEASON,
            "status": "NS",        # Not started
        },
    )
    resp.raise_for_status()
    data = resp.json()

    errors = data.get("errors")
    if errors and (isinstance(errors, dict) and errors or isinstance(errors, list) and errors):
        print(f"API error: {errors}")
        return

    fixtures = data.get("response", [])
    print(f"{len(fixtures)} fixtures")

    with open(FIXTURES_UPCOMING_FILE, "w") as f:
        json.dump(fixtures, f, indent=2)

    progress["fixtures_upcoming_done"] = True
    save_progress(progress)

    print(f"\nDone. {len(fixtures)} upcoming fixtures saved to {FIXTURES_UPCOMING_FILE}")

    if fixtures:
        teams = set()
        for fix in fixtures:
            teams.add(fix["teams"]["home"]["name"])
            teams.add(fix["teams"]["away"]["name"])

        print(f"Teams:  {len(teams)}")
        print(f"Rounds: {len(set(f['league']['round'] for f in fixtures))}")
        print(f"Dates:  {fixtures[0]['fixture']['date'][:10]} → {fixtures[-1]['fixture']['date'][:10]}")
        print(f"\nNext 5 matches:")
        for fix in fixtures[:5]:
            print(f"  {fix['fixture']['date'][:10]}  {fix['teams']['home']['name']} vs {fix['teams']['away']['name']}")


if __name__ == "__main__":
    main()
