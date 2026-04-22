"""
Collect per-match player stats for cup + European fixtures involving PL clubs.

Strategy:
  1. Build a set of PL club IDs from existing fixtures_{season}.json files.
  2. For each (league, season), load fixtures_{league}_{season}.json and filter
     to only fixtures where home_id or away_id is a PL club.
  3. Fetch /fixtures/players for each kept fixture.

Competitions: FA Cup (45), EFL Cup (48), UCL (2), UEL (3), UECL (848)
Seasons:      ALL_SEASONS (2022, 2023, 2024, 2025)

Estimated calls: ~800 total (Pro tier handles in ~7 min)
Output: data/raw/match_stats_{league}_{season}.json per combination
"""

import json
import time
import requests
from config import (
    HEADERS, BASE_URL, ALL_SEASONS, DELAY,
    RAW_DIR, PROGRESS_FILE,
    CUP_LEAGUES, fixtures_file,
    cup_fixtures_file, cup_match_stats_file,
)


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def build_pl_club_ids() -> set:
    """Extract all PL team IDs from the existing PL fixtures files."""
    pl_ids = set()
    for season in ALL_SEASONS:
        path = fixtures_file(season)
        if not path.exists():
            print(f"  Warning: {path} not found — skipping for PL club ID extraction.")
            continue
        with open(path) as f:
            fixtures = json.load(f)
        for fix in fixtures:
            pl_ids.add(fix["teams"]["home"]["id"])
            pl_ids.add(fix["teams"]["away"]["id"])
    return pl_ids


def load_cup_stats(league_id: int, season: int) -> dict:
    path = cup_match_stats_file(league_id, season)
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


def save_cup_stats(league_id: int, season: int, data: dict):
    with open(cup_match_stats_file(league_id, season), "w") as f:
        json.dump(data, f, indent=2)


def collect(league_id: int, league_name: str, season: int, pl_ids: set, progress: dict):
    fixtures_path = cup_fixtures_file(league_id, season)
    if not fixtures_path.exists():
        print(f"  {league_name} {season}: fixtures file not found — run collect_fixtures_cups.py first.")
        return

    with open(fixtures_path) as f:
        all_fixtures = json.load(f)

    # Filter to only PL-involving fixtures
    pl_fixtures = [
        fix for fix in all_fixtures
        if fix["teams"]["home"]["id"] in pl_ids or fix["teams"]["away"]["id"] in pl_ids
    ]

    progress_key = f"match_stats_{league_id}_{season}_done"
    done         = set(progress.get(progress_key, []))
    match_stats  = load_cup_stats(league_id, season)

    total     = len(pl_fixtures)
    remaining = total - len(done)
    fetched   = 0
    errors    = 0

    print(f"\n── {league_name} {season} ─────────────────────────────")
    print(f"  Total fixtures: {len(all_fixtures)}  |  PL-involving: {total}  "
          f"|  Already fetched: {len(done)}  |  Remaining: {remaining}")

    if remaining == 0:
        print("  All done, skipping.")
        return

    for i, fix in enumerate(pl_fixtures, 1):
        fixture_id = str(fix["fixture"]["id"])
        date       = fix["fixture"]["date"][:10]
        home       = fix["teams"]["home"]["name"]
        away       = fix["teams"]["away"]["name"]

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

        if fetched % 50 == 0:
            save_cup_stats(league_id, season, match_stats)
            save_progress(progress)
            print(f"  [checkpoint: {fetched} fetched so far]")

        print(f"{total_players} players")
        time.sleep(DELAY)

    save_cup_stats(league_id, season, match_stats)
    save_progress(progress)

    print(f"  Done — fetched: {fetched}, errors: {errors}, total in file: {len(match_stats)}")


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    progress = load_progress()

    print("Building PL club ID set from existing fixture files...")
    pl_ids = build_pl_club_ids()
    print(f"  Found {len(pl_ids)} unique PL club IDs across all seasons.\n")

    # Estimate remaining calls
    remaining_total = 0
    for league_id, league_name in CUP_LEAGUES.items():
        for season in ALL_SEASONS:
            fx_path = cup_fixtures_file(league_id, season)
            if not fx_path.exists():
                continue
            with open(fx_path) as f:
                all_fx = json.load(f)
            pl_fx = [
                fx for fx in all_fx
                if fx["teams"]["home"]["id"] in pl_ids or fx["teams"]["away"]["id"] in pl_ids
            ]
            done = set(progress.get(f"match_stats_{league_id}_{season}_done", []))
            remaining_total += len(pl_fx) - len(done)

    print(f"Estimated remaining API calls: ~{remaining_total}")
    print(f"Estimated time at {DELAY}s/call:   ~{remaining_total * DELAY / 60:.0f} min\n")

    for league_id, league_name in CUP_LEAGUES.items():
        for season in ALL_SEASONS:
            collect(league_id, league_name, season, pl_ids, progress)

    print(f"\n{'─'*50}")
    print("All cup/Euro seasons collected.")
    print("Next step: python3.14 build_match_stats.py")


if __name__ == "__main__":
    main()
