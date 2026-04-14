"""
Test script — look up a player's full injury history from our collected data.

Usage:
    python3.14 test_player_injuries.py "Alexander Isak"
    python3.14 test_player_injuries.py "Isak"
    python3.14 test_player_injuries.py --id 2864
"""

import sys
import json
import argparse
import pandas as pd
from config import RAW_DIR, DATA_DIR

PLAYERS_FILE  = RAW_DIR / "players_season_stats.json"
SIDELINED_FILE = RAW_DIR / "sidelined.json"
INJURIES_CSV  = DATA_DIR / "injuries.csv"


def find_player(name_query: str) -> list[dict]:
    with open(PLAYERS_FILE) as f:
        players = json.load(f)

    seen = {}
    for entry in players:
        p = entry.get("player", {})
        pid = p.get("id")
        pname = p.get("name", "")
        if pid and pid not in seen and name_query.lower() in pname.lower():
            seen[pid] = pname

    return [{"id": pid, "name": name} for pid, name in seen.items()]


def show_injuries(player_id: int, player_name: str):
    # ── Raw sidelined.json ────────────────────────────────────────────────────
    with open(SIDELINED_FILE) as f:
        sidelined = json.load(f)

    raw_records = sidelined.get(str(player_id), [])

    print(f"\n{'═'*60}")
    print(f"  {player_name}  (id: {player_id})")
    print(f"{'═'*60}")

    # ── injuries.csv (processed) ──────────────────────────────────────────────
    inj = pd.read_csv(INJURIES_CSV, parse_dates=["start_date", "end_date"])
    player_inj = inj[inj["player_id"] == player_id].sort_values("start_date", ascending=False)

    if player_inj.empty:
        print("  No processed injury records found in injuries.csv")
    else:
        print(f"\n  {len(player_inj)} injury record(s) in injuries.csv:\n")
        print(f"  {'Start':<12} {'End':<12} {'Days':>5}  {'Type':<30} {'Severity':<12} {'Body Region'}")
        print(f"  {'-'*100}")
        for _, row in player_inj.iterrows():
            start    = str(row["start_date"].date()) if pd.notna(row["start_date"]) else "?"
            end      = str(row["end_date"].date())   if pd.notna(row["end_date"])   else "ongoing"
            days     = f"{row['days_out']:.0f}"      if pd.notna(row.get("days_out")) else "?"
            itype    = str(row.get("injury_type", "?"))
            severity = str(row.get("severity", "?"))
            region   = str(row.get("body_region", "?"))
            print(f"  {start:<12} {end:<12} {days:>5}  {itype:<30} {severity:<12} {region}")

    # ── Raw records summary ───────────────────────────────────────────────────
    print(f"\n  Raw sidelined.json records: {len(raw_records)}")
    if raw_records:
        print(f"\n  {'Start':<12} {'End':<12}  {'Type'}")
        print(f"  {'-'*55}")
        for r in sorted(raw_records, key=lambda x: x.get("start") or "", reverse=True):
            start = r.get("start") or "?"
            end   = r.get("end")   or "ongoing"
            rtype = r.get("type")  or "?"
            print(f"  {start:<12} {end:<12}  {rtype}")

    print()


def main():
    parser = argparse.ArgumentParser(description="Look up a player's injury history")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("name", nargs="?", help="Player name (partial match)")
    group.add_argument("--id", type=int, help="Player ID")
    args = parser.parse_args()

    if args.id:
        # Direct ID lookup — find name from players file
        with open(PLAYERS_FILE) as f:
            players = json.load(f)
        names = {p["player"]["id"]: p["player"]["name"] for p in players if "player" in p}
        name = names.get(args.id, "Unknown")
        show_injuries(args.id, name)

    else:
        matches = find_player(args.name)
        if not matches:
            print(f"No player found matching '{args.name}'")
            sys.exit(1)
        if len(matches) > 1:
            print(f"Multiple matches for '{args.name}':")
            for m in matches:
                print(f"  {m['id']:>8}  {m['name']}")
            print("\nRe-run with --id <id> to pick one.")
            sys.exit(0)
        show_injuries(matches[0]["id"], matches[0]["name"])


if __name__ == "__main__":
    main()
