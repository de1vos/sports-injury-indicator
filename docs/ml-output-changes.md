# ML Output Changes — Implementation Plan

## Overview

Two changes requested by the ML team:

1. **`matches.json` — include all matches this season** (not just ±2 weeks)
2. **One season stat per player per season** (fix duplicate rows from mid-season transfers)

---

## Change 1 — `matches.json`: All Season Matches

### Problem

`predict_players.py` currently filters fixtures to a ±2-week window around today using `TWO_WEEKS = timedelta(days=14)`. This means `matches.json` only contains ~6 recent game weeks instead of all 38.

### Root Cause

In `ml/predict_players.py`, the match collection section (search for `TWO_WEEKS`) restricts which fixtures are written to `output/matches.json`. The raw data sources (`data/raw/fixtures_2025.json` + `data/raw/fixtures_upcoming.json`) already contain the full season — they just aren't all being written out.

### Fix: `ml/predict_players.py`

Remove the date-window filter when building `matches.json`. Write **all** completed fixtures for the season as `completed`, and **all** not-started fixtures as `upcoming`.

```python
# BEFORE (approximate — uses TWO_WEEKS filter):
now = datetime.now(timezone.utc)
window_start = now - TWO_WEEKS
window_end   = now + TWO_WEEKS

completed = [fx for fx in completed_raw if window_start <= fx_date <= now]
upcoming  = [fx for fx in upcoming_raw  if now < fx_date <= window_end]

# AFTER — remove date filter, keep all fixtures:
completed = completed_raw   # all status=FT fixtures this season
upcoming  = upcoming_raw    # all status=NS fixtures this season
```

### Fix: `output/matches.json` schema (no change needed)

The existing schema already supports this — `completed` and `upcoming` arrays just need more entries. Each fixture object stays the same:

```json
{
  "fixture_id": 1379310,
  "date": "2026-05-03T18:00:00+00:00",
  "round": "Regular Season - 35",
  "home_team_id": 66,
  "away_team_id": 47,
  "home_team": { "name": "Aston Villa", "logo": "..." },
  "away_team": { "name": "Tottenham",   "logo": "..." },
  "venue": "Villa Park",
  "score": { "home": 1, "away": 2 }   ← only on completed
}
```

### Impact on DB / Ingest

`ingest_predictions.py` already ingests all fixtures from `matches.json` — no changes needed. The `match` table will just have more rows (~380 instead of ~39).

The `match_game_week` column uses `gw1`–`gw38` parsed from the `"round"` field — already handled by `GW_ROUND_RE`.

---

## Change 2 — One Season Stat Per Player Per Season

### Problem

166 players have multiple `season_stats` entries for the same season year in `predictions.json`. This happens when a player transferred mid-season and has stats for two teams in the same season (e.g. Matheus Cunha: two rows for 2024, two rows for 2023).

`ingest_predictions.py` blindly inserts all rows → `player_season` table ends up with duplicate `(player_id, player_season_year)` combinations. The app then shows wrong stats or picks an arbitrary row.

### Root Cause

`get_all_season_stats()` in `ml/predict_players.py` runs:

```python
rows = season_stats_df[season_stats_df["player_id"] == player_id].sort_values("season", ascending=False)
```

`season_stats.csv` has one row per player per team per season (from `build_season_stats.py`). If a player played for two teams in the same season, there are two rows — both are emitted into `predictions.json`.

### Fix A — `ml/predict_players.py`: Aggregate before emitting

In `get_all_season_stats()`, after filtering by `player_id`, group by `season` and sum the counting stats, average the rating:

```python
def get_all_season_stats(...) -> list[dict]:
    rows = season_stats_df[season_stats_df["player_id"] == player_id].copy()

    # Aggregate across teams within the same season
    agg_funcs = {col: "sum" for col in SEASON_STATS_COLS if col != "rating"}
    agg_funcs["rating"] = "mean"
    rows = rows.groupby("season", as_index=False).agg(agg_funcs)
    rows = rows.sort_values("season", ascending=False)

    result = []
    for _, row in rows.iterrows():
        season = int(row["season"])
        entry  = {"season": season}
        for col in SEASON_STATS_COLS:
            if col not in row.index:
                continue
            entry[col] = safe_float(row[col], 2) if col == "rating" else safe_int(row[col])
        entry["games_missed"] = get_games_missed(
            player_id, season, team_id, injuries_df, team_to_fixtures
        )
        result.append(entry)
    return result
```

This produces exactly one dict per season in `predictions.json["players"][n]["season_stats"]`.

### Fix B — DB: Add unique constraint on `player_season`

Add a `UNIQUE(player_id, player_season_year)` constraint so the DB enforces one row per player per season. Run this SQL migration in Supabase:

```sql
ALTER TABLE player_season
  ADD CONSTRAINT uq_player_season_year
  UNIQUE (player_id, player_season_year);
```

Update `database_init.py` to reflect this:

```python
class PlayerSeason(SQLModel, table=True):
    __tablename__: ClassVar[str] = "player_season"
    __table_args__: ClassVar[tuple] = (
        UniqueConstraint("player_id", "player_season_year", name="uq_player_season_year"),
    )
    ...
```

### Fix C — `server/ingest_predictions.py`: Defensive deduplication

Even after Fix A, add a deduplication safety net before inserting to avoid crashing on unexpected duplicates:

```python
# In the player seasons section, before inserting:
seen_season_keys: set[tuple[int, int]] = set()
for p in players:
    for s in p.get("season_stats", []):
        key = (p["player_id"], s.get("season") or 0)
        if key in seen_season_keys:
            print(f"  [WARN] duplicate season skipped: player={p['player_id']} season={s.get('season')}")
            continue
        seen_season_keys.add(key)
        season_rows.append({ ... })
```

---

## Execution Order

| Step | What | Where |
|------|------|-------|
| 1 | Remove `TWO_WEEKS` filter in match collection | `ml/predict_players.py` |
| 2 | Aggregate season stats by `(player_id, season)` in `get_all_season_stats()` | `ml/predict_players.py` |
| 3 | Re-run `python3 predict_players.py` to regenerate `output/predictions.json` + `output/matches.json` | ML pipeline |
| 4 | Verify `matches.json` has all rounds (GW1–GW38) and no player in `predictions.json` has duplicate seasons | Manual check |
| 5 | Run SQL migration to add UNIQUE constraint | Supabase SQL Editor |
| 6 | Update `database_init.py` with `UniqueConstraint` | `server/database_init.py` |
| 7 | Add deduplication guard in ingest | `server/ingest_predictions.py` |
| 8 | Run `python seed_db.py` to re-seed DB with clean data | Server |

---

## Files Changed

| File | Change |
|------|--------|
| `ml/predict_players.py` | Remove `TWO_WEEKS` filter; aggregate season stats by season |
| `server/database_init.py` | Add `UniqueConstraint` on `(player_id, player_season_year)` |
| `server/ingest_predictions.py` | Add deduplication guard before season insert |
| `output/matches.json` | Re-generated — all ~380 season fixtures |
| `output/predictions.json` | Re-generated — one `season_stats` entry per season per player |

---

## Verification

After re-seeding:

```sql
-- Should return 0
SELECT player_id, player_season_year, COUNT(*)
FROM player_season
GROUP BY player_id, player_season_year
HAVING COUNT(*) > 1;

-- Should be ~380 (38 GWs × 10 matches)
SELECT COUNT(*) FROM match;

-- Check round coverage
SELECT DISTINCT match_game_week FROM match ORDER BY match_game_week;
```
