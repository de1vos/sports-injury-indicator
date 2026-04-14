"""
Steps 1.1 + 1.2 — Collect player profiles and season stats.

Fetches all Premier League players for seasons 2022, 2023, 2024, 2025
from API-Football. Caches every page response to disk immediately.
If interrupted, re-running resumes from where it left off — no wasted calls.

Output: data/raw/players_season_stats.json
        data/progress.json
"""

import json
import time
import requests
from config import (
    HEADERS, BASE_URL, LEAGUE, ALL_SEASONS, DELAY,
    RAW_DIR, PLAYERS_FILE, PROGRESS_FILE,
)

# ── Helpers ───────────────────────────────────────────────────────────────────
def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def load_results() -> list:
    if PLAYERS_FILE.exists():
        with open(PLAYERS_FILE) as f:
            return json.load(f)
    return []


def save_results(results: list):
    with open(PLAYERS_FILE, "w") as f:
        json.dump(results, f, indent=2)


def fetch_page(season: int, page: int) -> dict:
    """Fetch one page of players for a given season. Returns the full API response."""
    resp = requests.get(
        f"{BASE_URL}/players",
        headers=HEADERS,
        params={"league": LEAGUE, "season": season, "page": page},
    )
    resp.raise_for_status()
    return resp.json()


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    progress = load_progress()
    results  = load_results()

    # Build a set of already-fetched (season, page) keys for fast lookup
    done = set(progress.get("players_pages_done", []))

    total_calls   = 0
    total_players = len(results)

    for season in ALL_SEASONS:
        print(f"\n── Season {season} ────────────────────────────")

        # Fetch page 1 first to discover total pages
        key_p1 = f"{season}_1"
        if key_p1 not in done:
            print(f"  Page 1 ...", end=" ", flush=True)
            data = fetch_page(season, 1)
            total_calls += 1

            errors = data.get("errors")
            if errors and (isinstance(errors, dict) and errors or isinstance(errors, list) and errors):
                print(f"API error: {errors}")
                continue

            paging    = data.get("paging", {})
            total_pgs = paging.get("total", 1)
            players   = data.get("response", [])

            results.extend(players)
            total_players += len(players)
            done.add(key_p1)
            progress["players_pages_done"]      = list(done)
            progress[f"total_pages_{season}"]   = total_pgs
            save_results(results)
            save_progress(progress)
            print(f"{len(players)} players  (total pages: {total_pgs})")
            time.sleep(DELAY)
        else:
            total_pgs = progress.get(f"total_pages_{season}", 1)
            print(f"  Page 1 already fetched. Total pages: {total_pgs}")

        # Fetch remaining pages
        for page in range(2, total_pgs + 1):
            key = f"{season}_{page}"
            if key in done:
                print(f"  Page {page}/{total_pgs} already fetched, skipping.")
                continue

            print(f"  Page {page}/{total_pgs} ...", end=" ", flush=True)
            data = fetch_page(season, page)
            total_calls += 1

            errors = data.get("errors")
            if errors and (isinstance(errors, dict) and errors or isinstance(errors, list) and errors):
                print(f"API error: {errors}")
                time.sleep(DELAY)
                continue

            players = data.get("response", [])
            results.extend(players)
            total_players += len(players)

            done.add(key)
            progress["players_pages_done"]    = list(done)
            progress[f"total_pages_{season}"] = total_pgs
            save_results(results)
            save_progress(progress)

            print(f"{len(players)} players  (running total: {total_players})")
            time.sleep(DELAY)

        print(f"  Season {season} complete.")

    print(f"\n{'─'*50}")
    print(f"Done. Total API calls this run: {total_calls}")
    print(f"Total player-season entries:    {total_players}")
    print(f"Output: {PLAYERS_FILE}")


if __name__ == "__main__":
    main()
