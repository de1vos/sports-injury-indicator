"""
Step 1.7 — Collect full career injury/sidelined history for every player.

Endpoint: GET /sidelined?player={id}
Calls:    1 per unique player (~1,200)
Output:   data/raw/sidelined.json  — dict keyed by player ID
"""

import argparse
import json
import time
import requests
from config import HEADERS, BASE_URL, DELAY, RAW_DIR, PLAYERS_FILE, SIDELINED_FILE, PROGRESS_FILE


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def load_sidelined() -> dict:
    if SIDELINED_FILE.exists():
        with open(SIDELINED_FILE) as f:
            return json.load(f)
    return {}


def save_sidelined(data: dict):
    with open(SIDELINED_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_unique_player_ids() -> list[tuple[int, str]]:
    """Return sorted list of (player_id, name) for all unique players across all seasons."""
    if not PLAYERS_FILE.exists():
        print("players_season_stats.json not found — run collect_players.py first.")
        return []

    with open(PLAYERS_FILE) as f:
        players = json.load(f)

    seen = {}
    for entry in players:
        p   = entry.get("player", {})
        pid = p.get("id")
        if pid and pid not in seen:
            seen[pid] = p.get("name", "Unknown")

    return sorted(seen.items())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true",
                        help="Clear cached progress and re-fetch all players")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    player_ids = get_unique_player_ids()
    if not player_ids:
        return

    progress  = load_progress()
    sidelined = load_sidelined()

    if args.force:
        print("--force: clearing sidelined cache, re-fetching all players...\n")
        progress.pop("sidelined_done", None)
        sidelined = {}

    done = set(str(pid) for pid in progress.get("sidelined_done", []))

    total     = len(player_ids)
    remaining = total - len(done)

    print(f"Unique players:  {total}")
    print(f"Already fetched: {len(done)}")
    print(f"Remaining:       {remaining}")
    print(f"Est. time:       ~{remaining * DELAY / 60:.0f} min")
    print()

    fetched = 0
    errors  = 0

    for i, (player_id, name) in enumerate(player_ids, 1):
        pid_str = str(player_id)

        if pid_str in done:
            continue

        print(f"  [{i}/{total}] {name} (id:{player_id}) ...", end=" ", flush=True)

        resp = requests.get(
            f"{BASE_URL}/sidelined",
            headers=HEADERS,
            params={"player": player_id},
        )
        resp.raise_for_status()
        data = resp.json()

        api_errors = data.get("errors")
        if api_errors and (isinstance(api_errors, dict) and api_errors or isinstance(api_errors, list) and api_errors):
            print(f"API error: {api_errors}")
            errors += 1
            time.sleep(DELAY)
            continue

        records           = data.get("response", [])
        sidelined[pid_str] = records

        done.add(pid_str)
        fetched += 1
        progress["sidelined_done"] = list(done)

        # Save every 50 players to avoid losing progress on interruption
        if fetched % 50 == 0:
            save_sidelined(sidelined)
            save_progress(progress)

        print(f"{len(records)} records")
        time.sleep(DELAY)

    # Final save
    save_sidelined(sidelined)
    save_progress(progress)

    total_records        = sum(len(v) for v in sidelined.values())
    players_with_history = sum(1 for v in sidelined.values() if len(v) > 0)

    print(f"\n{'─'*50}")
    print(f"Done.")
    print(f"  Fetched this run:        {fetched}")
    print(f"  Errors:                  {errors}")
    print(f"  Total players in file:   {len(sidelined)}")
    print(f"  Players with history:    {players_with_history}")
    print(f"  Total injury records:    {total_records}")
    print(f"  Output: {SIDELINED_FILE}")


if __name__ == "__main__":
    main()
