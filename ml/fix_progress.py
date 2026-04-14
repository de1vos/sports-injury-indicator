"""
Checks which pages are marked done in progress.json but whose data
is actually missing from players_season_stats.json, then removes
those entries so collect_players.py will re-fetch them.

Run this before re-running collect_players.py.
"""

import json
from config import PLAYERS_FILE, PROGRESS_FILE, ALL_SEASONS

# ── Load both files ───────────────────────────────────────────────────────────
with open(PROGRESS_FILE) as f:
    progress = json.load(f)

with open(PLAYERS_FILE) as f:
    players = json.load(f)

# ── Count actual player entries per season ────────────────────────────────────
print("Players actually in data file:")
actual_counts = {}
for season in ALL_SEASONS:
    count = sum(
        1 for entry in players
        if any(s["league"]["season"] == season for s in entry.get("statistics", []))
    )
    actual_counts[season] = count
    pages_done = sum(1 for k in progress["players_pages_done"] if k.startswith(f"{season}_"))
    expected   = pages_done * 20  # ~20 players per page
    status     = "OK" if count >= expected * 0.8 else "MISSING DATA"
    print(f"  {season}: {count} players | {pages_done} pages marked done | ~{expected} expected  [{status}]")

# ── Find seasons where data looks short ───────────────────────────────────────
print()
to_remove = []
for season in ALL_SEASONS:
    pages_done = [k for k in progress["players_pages_done"] if k.startswith(f"{season}_")]
    expected   = len(pages_done) * 20
    actual     = actual_counts[season]

    if actual < expected * 0.8:
        missing_pages = expected - actual
        approx_pages  = round(missing_pages / 20)
        print(f"Season {season}: ~{missing_pages} players missing (~{approx_pages} pages).")

        # Remove pages from the bottom up until the count looks right
        pages_sorted = sorted(pages_done, key=lambda x: int(x.split("_")[1]))
        remove_count = approx_pages
        removed      = pages_sorted[:remove_count]
        to_remove.extend(removed)
        print(f"  Will remove from progress: {removed}")

# ── Apply fix ─────────────────────────────────────────────────────────────────
if to_remove:
    print(f"\nRemoving {len(to_remove)} page entries from progress.json...")
    progress["players_pages_done"] = [
        k for k in progress["players_pages_done"] if k not in to_remove
    ]
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)
    print("Done. Re-run collect_players.py to fetch the missing pages.")
else:
    print("\nNo issues found — all pages appear to have data.")
