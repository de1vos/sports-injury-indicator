"""
Step 1.4 — Collect per-match player stats for all 2025/26 fixtures.

Endpoint: GET /fixtures/players?fixture={id}
Calls:    1 per completed fixture (~319)
Output:   data/raw/match_stats_2025.json  — dict keyed by fixture ID
"""

import json
import time
import requests
from config import HEADERS, BASE_URL, DELAY, RAW_DIR, FIXTURES_FILE, MATCH_STATS_FILE, PROGRESS_FILE


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def load_match_stats() -> dict:
    if MATCH_STATS_FILE.exists():
        with open(MATCH_STATS_FILE) as f:
            return json.load(f)
    return {}


def save_match_stats(data: dict):
    with open(MATCH_STATS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    # Load fixtures
    if not FIXTURES_FILE.exists():
        print("fixtures_2025.json not found — run collect_fixtures.py first.")
        return

    with open(FIXTURES_FILE) as f:
        fixtures = json.load(f)

    progress   = load_progress()
    match_stats = load_match_stats()
    done        = set(progress.get("match_stats_done", []))

    total      = len(fixtures)
    fetched    = 0
    skipped    = 0
    errors     = 0

    print(f"Fixtures to process: {total}")
    print(f"Already fetched:     {len(done)}")
    print(f"Remaining:           {total - len(done)}")
    print()

    for i, fix in enumerate(fixtures, 1):
        fixture_id  = str(fix["fixture"]["id"])
        date        = fix["fixture"]["date"][:10]
        home        = fix["teams"]["home"]["name"]
        away        = fix["teams"]["away"]["name"]

        if fixture_id in done:
            skipped += 1
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

        response = data.get("response", [])
        total_players = sum(len(team.get("players", [])) for team in response)

        # Store the full response for this fixture
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
        progress["match_stats_done"] = list(done)
        save_match_stats(match_stats)
        save_progress(progress)

        print(f"{total_players} players")
        time.sleep(DELAY)

    print(f"\n{'─'*50}")
    print(f"Done.")
    print(f"  Fetched this run: {fetched}")
    print(f"  Skipped (cached): {skipped}")
    print(f"  Errors:           {errors}")
    print(f"  Total in file:    {len(match_stats)} fixtures")
    print(f"  Output: {MATCH_STATS_FILE}")


if __name__ == "__main__":
    main()
