"""
Step 1.8 — Collect per-season injury reports for all PL seasons.

Endpoint: GET /injuries?league=39&season={year}
Calls:    1 per season (no pagination — all results in one response)
Output:   data/raw/injuries_season_{year}.json

These supplement /sidelined data which is often incomplete for recent seasons.
Each record is a pre-match injury report: which players were unavailable per fixture.
"""

import json
import time
import requests
from config import HEADERS, BASE_URL, DELAY, RAW_DIR, ALL_SEASONS, PROGRESS_FILE


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def season_injuries_file(season: int):
    return RAW_DIR / f"injuries_season_{season}.json"


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-fetch even if already collected")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    progress = load_progress()

    for season in ALL_SEASONS:
        key = f"injuries_season_{season}_done"
        if progress.get(key) and not args.force:
            print(f"Season {season}: already collected, skipping.")
            continue

        print(f"Season {season}: fetching injury reports...", end=" ", flush=True)

        resp = requests.get(
            f"{BASE_URL}/injuries",
            headers=HEADERS,
            params={"league": 39, "season": season},
        )
        resp.raise_for_status()
        data = resp.json()

        errors = data.get("errors")
        if errors and errors != [] and errors != {}:
            print(f"API error: {errors}")
            continue

        records = data.get("response", [])
        print(f"{len(records)} records")

        out_file = season_injuries_file(season)
        with open(out_file, "w") as f:
            json.dump(records, f, indent=2)

        progress[key] = True
        save_progress(progress)

        time.sleep(DELAY)

    print("\nDone. Files saved:")
    for season in ALL_SEASONS:
        f = season_injuries_file(season)
        if f.exists():
            with open(f) as fh:
                n = len(json.load(fh))
            print(f"  {f.name}: {n} records")


if __name__ == "__main__":
    main()
