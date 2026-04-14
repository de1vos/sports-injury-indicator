"""
Step 1.5 — Collect squad data (kit numbers) for all 20 PL teams.

Endpoint: GET /players/squads?team={id}
Calls:    1 per team (20 total)
Output:   data/raw/squads.json  — dict keyed by team ID
"""

import json
import time
import requests
from config import HEADERS, BASE_URL, LEAGUE, CURRENT_SEASON, DELAY, RAW_DIR, FIXTURES_FILE, SQUADS_FILE, PROGRESS_FILE


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def load_squads() -> dict:
    if SQUADS_FILE.exists():
        with open(SQUADS_FILE) as f:
            return json.load(f)
    return {}


def save_squads(data: dict):
    with open(SQUADS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_team_ids() -> list[tuple[int, str]]:
    """Extract unique team IDs and names from the completed fixtures file."""
    if not FIXTURES_FILE.exists():
        print("fixtures_2025.json not found — run collect_fixtures.py first.")
        return []

    with open(FIXTURES_FILE) as f:
        fixtures = json.load(f)

    teams = {}
    for fix in fixtures:
        for side in ["home", "away"]:
            tid  = fix["teams"][side]["id"]
            name = fix["teams"][side]["name"]
            teams[tid] = name

    return sorted(teams.items(), key=lambda x: x[1])


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    team_ids = get_team_ids()
    if not team_ids:
        return

    progress = load_progress()
    squads   = load_squads()
    done     = set(str(tid) for tid in progress.get("squads_done", []))

    print(f"Teams to fetch: {len(team_ids)}")
    print(f"Already done:   {len(done)}")
    print()

    fetched = 0

    for i, (team_id, team_name) in enumerate(team_ids, 1):
        tid_str = str(team_id)

        if tid_str in done:
            print(f"  [{i}/20] {team_name} — already fetched, skipping.")
            continue

        print(f"  [{i}/20] {team_name} ...", end=" ", flush=True)

        resp = requests.get(
            f"{BASE_URL}/players/squads",
            headers=HEADERS,
            params={"team": team_id},
        )
        resp.raise_for_status()
        data = resp.json()

        api_errors = data.get("errors")
        if api_errors and (isinstance(api_errors, dict) and api_errors or isinstance(api_errors, list) and api_errors):
            print(f"API error: {api_errors}")
            time.sleep(DELAY)
            continue

        response = data.get("response", [])
        players  = response[0].get("players", []) if response else []

        squads[tid_str] = {
            "team_id":   team_id,
            "team_name": team_name,
            "players":   players,
        }

        done.add(tid_str)
        fetched += 1
        progress["squads_done"] = list(done)
        save_squads(squads)
        save_progress(progress)

        print(f"{len(players)} players")
        time.sleep(DELAY)

    print(f"\n{'─'*50}")
    print(f"Done.")
    print(f"  Fetched this run: {fetched}")
    print(f"  Total teams:      {len(squads)}")
    total_players = sum(len(v["players"]) for v in squads.values())
    print(f"  Total players:    {total_players}")
    print(f"  Output: {SQUADS_FILE}")

    # Spot check — show first team's squad
    if squads:
        sample_team = list(squads.values())[0]
        print(f"\nSample — {sample_team['team_name']}:")
        for p in sample_team["players"][:5]:
            print(f"  #{p.get('number', '?'):>2}  {p['name']}")


if __name__ == "__main__":
    main()
