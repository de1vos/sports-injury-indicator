# DB Design Changes Plan

**Goal:** replace all date-based estimates of the current season year and current gameweek with a single authoritative `season_meta` row in PostgreSQL, and expose two name→ID lookup endpoints via a new `search` router.

**Phasing:**
- **Phase 1** — add `season_meta` table, populate it from the ingestor, and replace every hardcoded date calculation in the backend with a DB read.
- **Phase 2** — replace the frontend's `currentGameweek()` date estimate with a call to the new `GET /search/season` endpoint. Drop the now-redundant `graph_data.graph_data_current_gw` column.
- **Phase 3** — add the `search` router with player and team lookup endpoints.

---

## 1. The problem today (where the gaps are)

```
season_meta ──► ❌ does not exist

current season year
  backend: _current_season_year() ──► date.today() calculation  ← 4 files duplicate this
  frontend: ❌ not used (frontend doesn't filter by season)

current gameweek
  backend: graph_data.graph_data_current_gw ──► one copy per player row  ← redundant
  frontend: currentGameweek() ──► date-based estimate  ← drifts on international breaks
```

**The gap:** nothing in the DB records what season or gameweek it is. The backend computes the season year from `date.today()` in four places independently. The frontend estimates the gameweek from a fixed season-start date — it disagrees with real fixtures any week there is an international break or midweek round, causing the dashboard matches list to appear empty.

---

## 2. All affected locations

These are every place that currently uses a date-computed season year or gameweek. Each must be migrated.

### 2.1 Current season year — backend (→ `season_meta.current_season_year`)

| # | File | Location | What it does | Status |
|---|---|---|---|---|
| **S-1** | `server/integration/dashboard.py` | `_current_season_year()` + `_active_player_ids_sq()` | Filters high-risk dashboard to current-season players | ⬜ To do |
| **S-2** | `server/integration/teams.py` | `_current_season_year()` + `_active_player_ids_sq()` (line 8) and inline `current_season_year` (line 49) | Active-player filter for squad counts; active injury count | ⬜ To do |
| **S-3** | `server/integration/player_page.py` | `_current_season_year()` + `_active_player_ids_sq()` (line 8) and inline on lines 297, 325 | Team roster filter; season injury and games-played queries | ⬜ To do |
| **S-4** | `server/integration/my_players.py` | Inline `current_season_year` (line 22) | Season injury count for My Players page | ⬜ To do |

### 2.2 Current gameweek — backend (→ `season_meta.current_game_week`)

| # | File | Location | What it does | Status |
|---|---|---|---|---|
| **G-1** | `server/integration/player_page.py` | `graph_data_current_gw` read from `graph_data` table (line 235) | Returned to frontend as part of injury graph response — stored per-player but identical for all | ⬜ Phase 2 — drop column, read from `season_meta` |

### 2.3 Current gameweek — frontend (→ new `GET /search/season` endpoint)

| # | File | Location | What it does | Status |
|---|---|---|---|---|
| **G-2** | `frontendUpdatedSoccer2/src/app/api/dashboard.ts` | `currentGameweek()` function (line 88) | Estimates current GW from today's date to choose which matches to fetch | ⬜ Phase 2 — replace with API call |

---

## 3. Phase 1 — `season_meta` table + backend migration

### 3.1 Schema — new table (`server/database_init.py`)

Add after the existing `Nation` class:

```python
class SeasonMeta(SQLModel, table=True):
    __tablename__: ClassVar[str] = "season_meta"
    id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    current_season_year: int          # e.g. 2025 (year the PL season started)
    current_game_week: str = Field(max_length=10)  # e.g. "gw32"

    __table_args__: ClassVar[tuple] = (
        CheckConstraint(
            "current_game_week IN (" + ', '.join(f"'gw{i}'" for i in range(1, 39)) + ")",
            name='chk_season_meta_game_week'
        ),
    )
```

One row ever exists. The ingestor deletes and re-inserts it on every run, same as all ML-derived tables.

### 3.2 Ingestor changes (`server/ingest_predictions.py`)

**Step 1 — add `SeasonMeta` to the import (line 33)**

```python
# Before
from database_init import (
    engine,
    Nation, Team, Player, PlayerSeason, PlayerInjury, GraphData, Match,
)

# After
from database_init import (
    engine,
    Nation, Team, Player, PlayerSeason, PlayerInjury, GraphData, Match, SeasonMeta,
)
```

**Step 2 — fix the predictions.json load (line 94–95)**

`predictions.json` is a dict with a `"players"` key, not a bare list. The current code does `players = json.load(f)`, which means `for p in players` iterates over the dict keys instead of the 994 player records. Fix:

```python
# Before
with open(PREDICTIONS_FILE) as f:
    players = json.load(f)

# After
with open(PREDICTIONS_FILE) as f:
    predictions_raw = json.load(f)
players = predictions_raw["players"]
```

This also gives `predictions_raw` in scope for the `season_meta` insert below.

**Step 3 — add `SeasonMeta` to the wipe list (line 112):**
```python
for tbl in ("graph_data", "player_injury", "player_season", "match",
            "player", "team", "nation", "season_meta"):
    conn.execute(text(f"DELETE FROM {tbl}"))
```

**Step 4 — insert the row (after matches, before commit):**
```python
# Both values come directly from predictions.json, set by the ML pipeline
season_yr  = predictions_raw["current_season"]    # e.g. 2025  (int)
gw_int     = predictions_raw["current_gameweek"]  # e.g. 32    (int)
current_gw = f"gw{gw_int}"                        # → "gw32"

conn.execute(
    insert(SeasonMeta),
    [{"current_season_year": season_yr, "current_game_week": current_gw}],
)
print(f"  season_meta: year={season_yr}, gw={current_gw}")
```

**Step 5 — add `season_meta` to the row count summary (line 353):**
```python
# Before
for tbl in ("nation", "team", "player", "player_season", "player_injury", "graph_data", "match"):

# After
for tbl in ("nation", "team", "player", "player_season", "player_injury", "graph_data", "match", "season_meta"):
```

**Source of each value:**
- `current_season` — top-level field in `output/predictions.json`, e.g. `2025` (integer). Maps to `season_meta.current_season_year`.
- `current_gameweek` — top-level field in `output/predictions.json`, e.g. `32` (integer). Formatted as `f"gw{n}"` before storing. Maps to `season_meta.current_game_week`.

The ingestor does no date arithmetic — both values are treated as authoritative from the ML output.

**Edge cases:**
- Either field missing from `predictions.json` → ingestor raises a clear `KeyError` rather than silently falling back to a date estimate.

### 3.3 New file: `server/integration/common.py`

`common.py` is a new shared module that replaces the `_current_season_year()` and `_active_player_ids_sq()` helper functions that are currently duplicated across `dashboard.py`, `teams.py`, `player_page.py`, and `my_players.py`. Instead of each file computing the season year from `date.today()`, they all read the single `season_meta` row from the DB.

**Full file contents:**
```python
from sqlalchemy import func, select as sa_select
from sqlmodel import Session, select
from database_init import SeasonMeta, PlayerSeason


def get_season_meta(session: Session) -> SeasonMeta:
    """Returns the single season_meta row. Raises if DB is empty."""
    row = session.exec(select(SeasonMeta)).first()
    if row is None:
        raise RuntimeError("season_meta table is empty — run seed_db.py first")
    return row


def get_active_player_ids_sq(session: Session):
    """Subquery: players whose latest player_season row is the current PL season."""
    yr = get_season_meta(session).current_season_year
    return (
        sa_select(PlayerSeason.player_id)  # type: ignore[arg-type]
        .group_by(PlayerSeason.player_id)
        .having(func.max(PlayerSeason.player_season_year) == yr)
        .subquery("active_players")
    )
```

Each of the four integration files then replaces its local helpers with imports:

```python
from integration.common import get_season_meta, get_active_player_ids_sq
```

And every call site changes from `_active_player_ids_sq()` (no args) to `get_active_player_ids_sq(session)` (passes the session so it can query `season_meta`).

### 3.4 Migration: replace `_current_season_year()` in all four files

The general pattern is the same for all four files:

**Before:**
```python
def _current_season_year() -> int:
    today = date.today()
    return today.year if today.month >= 8 else today.year - 1

def some_query(session: Session):
    yr = _current_season_year()
    ...
    .having(func.max(PlayerSeason.player_season_year) == yr)
```

**After:**
```python
from integration.common import get_season_meta, get_active_player_ids_sq

def some_query(session: Session):
    yr = get_season_meta(session).current_season_year
    ...
    .having(func.max(PlayerSeason.player_season_year) == yr)
```

**Per-file notes:**

**S-1 — `dashboard.py`:**
- Remove `_current_season_year()` and `_active_player_ids_sq()` definitions (lines 9–22).
- `get_high_risk_players`: change `active_sq = _active_player_ids_sq()` → `get_active_player_ids_sq(session)`.
- Remove `from datetime import date` (no remaining uses after the helpers are gone).

**S-2 — `teams.py`:**
- Remove `_current_season_year()` and `_active_player_ids_sq()` definitions (lines 8–21).
- `get_teams_overview` line 35: change `active_sq = _active_player_ids_sq()` → `get_active_player_ids_sq(session)`.
- `get_teams_overview` lines 48–49: remove the inline `today`/`current_season_year` calc and replace with `current_season_year = get_season_meta(session).current_season_year`. Note: there are **two** separate date calcs in this file — the helper at the top AND this inline one inside `get_teams_overview`.
- Remove `from datetime import date` (no remaining uses after both calcs are gone).

**S-3 — `player_page.py`:**
- Remove `_current_season_year()` and `_active_player_ids_sq()` definitions (lines 8–21).
- `get_team_player_list` line 126: change `active_sq = _active_player_ids_sq()` → `get_active_player_ids_sq(session)`.
- `get_injury_analysis` line 297: remove inline `today`/`current_season_year` calc; replace with `current_season_year = get_season_meta(session).current_season_year`. This value is used on **three** lines in this function (297, 313, 325) — all three are covered by the single replacement at the top of the function.
- Keep `from datetime import date` — still used on line 337 (`date.today()`) for calculating days since last injury, which is unrelated to the season year.

**S-4 — `my_players.py`:**
- No helper function to remove — only an inline calc on line 22.
- Replace lines 21–22 (`today = date.today(); current_season_year = ...`) with `current_season_year = get_season_meta(session).current_season_year`.
- Add `from integration.common import get_season_meta` import.
- Remove `from datetime import date` (no remaining uses after the inline calc is gone).

### 3.5 Change `GET /dashboard/matches/{game_week}` → `GET /dashboard/matches`

The current endpoint requires the caller to supply the gameweek string. With `season_meta` available, the backend can look it up itself.

**Router change** (`server/routers/dashboard.py`):
```python
# Before
@router.get("/matches/{game_week}")
def game_week_matches(game_week: str, session: Session = Depends(get_session)):
    return dashboard.get_game_week_matches(game_week, session)

# After
@router.get("/matches")
def game_week_matches(session: Session = Depends(get_session)):
    return dashboard.get_game_week_matches(session)
```

**Integration change** (`server/integration/dashboard.py`):
```python
# Before
def get_game_week_matches(game_week: str, session: Session) -> List[GameWeekMatches]:
    ...
    .where(Match.match_game_week == game_week)

# After
def get_game_week_matches(session: Session) -> List[GameWeekMatches]:
    from integration.common import get_season_meta
    game_week = get_season_meta(session).current_game_week
    ...
    .where(Match.match_game_week == game_week)
```

---

## 4. Phase 2 — Drop `graph_data.graph_data_current_gw`

### 4.1 Drop `graph_data.graph_data_current_gw`

This column stores the same value (`"gw32"`) on every single player row — it belongs in `season_meta`, not `graph_data`.

- Remove the column from `GraphData` in `database_init.py`.
- Remove the `chk_graph_data_current_gw` CHECK constraint from `__table_args__`.
- Remove `"graph_data_current_gw"` from the ingestor's graph data row dict (`ingest_predictions.py` line 283).
- In `player_page.py` `get_injury_prediction_graph`, replace `graph.graph_data_current_gw` with `get_season_meta(session).current_game_week`.
- Update `InjuryPredictionGraph` TypedDict in `player_page.py` accordingly.

---

## 5. Phase 3 — Search router (name → ID lookup)

### 5.1 Files to create

| File | Purpose |
|---|---|
| `server/integration/search.py` | Query functions for player and team lookups |
| `server/routers/search.py` | FastAPI router, prefix `/search` |

Register in `server/main.py`:
```python
from routers import player_page, teams, dashboard, my_players, reported_injuries, search
app.include_router(search.router)
```

### 5.2 Endpoints

| Method | Path | Returns | Notes |
|---|---|---|---|
| `GET` | `/search/players` | `[{player_id, player_first_name, player_last_name, player_photo, team_name, player_injury_risk}]` | Current-season players only; ordered by last name |
| `GET` | `/search/teams` | `[{team_id, team_name, team_logo}]` | All teams; ordered alphabetically |
| `GET` | `/search/injury-regions` | `[{player_injury_region}]` | All unique injury regions across all `player_injury` rows |

### 5.3 Field-level mapping

#### `GET /search/players`
| Response field | Source |
|---|---|
| `player_id` | `player.player_id` |
| `player_first_name` | `player.player_first_name` |
| `player_last_name` | `player.player_last_name` |
| `player_photo` | `player.player_photo` |
| `team_name` | `team.team_name` (JOIN on `player.team_id`) |
| `player_injury_risk` | `player.player_injury_risk` (multiplied × 100, rounded) |

Filter: JOIN to `get_active_player_ids_sq()` — current-season players only. Ordered by last name.

#### `GET /search/teams`
| Response field | Source |
|---|---|
| `team_id` | `team.team_id` |
| `team_name` | `team.team_name` |
| `team_logo` | `team.team_logo` |

No filter — all teams in the `team` table.

#### `GET /search/injury-regions`
| Response field | Source |
|---|---|
| `player_injury_region` | `player_injury.player_injury_region` (DISTINCT, ordered alphabetically) |

---

## 6. TL;DR checklist

**Phase 1 — `season_meta` + backend migration + dashboard matches:**
- [ ] Add `SeasonMeta` model to `server/database_init.py`
- [ ] Add `SeasonMeta` to imports in `server/ingest_predictions.py`
- [ ] Fix predictions.json load (`predictions_raw = json.load(f); players = predictions_raw["players"]`)
- [ ] Add `season_meta` to wipe list in `server/ingest_predictions.py`
- [ ] Add `season_meta` insert step in `server/ingest_predictions.py`
- [ ] Add `season_meta` to row count summary in `server/ingest_predictions.py`
- [ ] Create `server/integration/common.py` with `get_season_meta()` and `get_active_player_ids_sq()`
- [ ] Migrate S-1 — `server/integration/dashboard.py` (remove helpers, update call site, remove `date` import)
- [ ] Migrate S-2 — `server/integration/teams.py` (remove helpers, update both date calcs, remove `date` import)
- [ ] Migrate S-3 — `server/integration/player_page.py` (remove helpers, update 3 uses in `get_injury_analysis`, keep `date` import)
- [ ] Migrate S-4 — `server/integration/my_players.py` (replace inline calc, add import, remove `date` import)
- [ ] Change `GET /dashboard/matches/{game_week}` → `GET /dashboard/matches` (gameweek from `season_meta`)
- [ ] Re-run `python server/ingest_predictions.py` to recreate schema and populate
- [ ] Smoke-test `GET /dashboard/matches`

**Phase 2 — drop redundant column:**
- [ ] Remove `graph_data_current_gw` from `GraphData` model and `__table_args__`
- [ ] Remove `graph_data_current_gw` from ingestor graph data row dict
- [ ] Replace `graph.graph_data_current_gw` in `player_page.py` with `get_season_meta(session).current_game_week`
- [ ] Re-run `python server/seed_db.py`

**Phase 3 — search router:**
- [ ] Create `server/integration/search.py`
- [ ] Create `server/routers/search.py`
- [ ] Register `search.router` in `server/main.py`
- [ ] Smoke-test `GET /search/players`
- [ ] Smoke-test `GET /search/teams`
- [ ] Smoke-test `GET /search/season`
