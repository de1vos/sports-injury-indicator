# Materialized View Indexes Plan

**Goal:** add indexes to every materialized view that is queried with a WHERE clause or JOIN, so those queries hit O(log n) paths instead of sequential scans. Views that are intentionally returned in full (search, teams overview, dashboard matches, reported injuries, trending list) are left without indexes — a seqscan is correct when the result *is* the whole view.

**Phasing:**
- **Phase 1** — point-lookup indexes for the per-player and per-team lookups (`mv_player_card`, `mv_injury_analysis`, `mv_team_player_list`).
- **Phase 2** — dual-purpose indexes for the dashboard views with both global-range and per-user-favourite query paths (`mv_high_risk_players`, `mv_trending_risk_players`).

---

## After every change

MVs are dropped and rebuilt on every ingest, so indexes live inside `create_views.py` and are recreated automatically:

```bash
cd server && python ingest_predictions.py   # drop → recreate schema + data + views + indexes
```

Then smoke-test the affected endpoint, e.g.:

```bash
curl http://localhost:8000/players/1/card
curl http://localhost:8000/players/1/injury-analysis
curl http://localhost:8000/players/team/1
```

---

## 1. Index type decision

PostgreSQL offers four index types relevant here: **B-tree**, **Hash**, **GIN**, and **BRIN**.

| Type | Best for | Why selected / ruled out |
|---|---|---|
| **B-tree** | equality (`=`), range (`<`/`>`), `ORDER BY`, `LIKE 'prefix%'` | **Selected for every index in this plan.** Every confirmed query pattern is either an equality lookup (`player_id = :pid`, `team_id = :tid`) or a range scan (`player_injury_risk > 0.50`). B-tree handles both natively. |
| **Hash** | equality only | Smaller on disk than B-tree but cannot serve range or sort. No upside here — B-tree gives equal performance for equality plus future flexibility. Ruled out. |
| **GIN + pg_trgm** | substring search (`ILIKE '%text%'`), full-text | Would only matter if SQL-side name search existed. The search endpoint deliberately returns the full player list (frontend filters client-side), so no SQL-side substring search will ever run on these MVs. Ruled out. |
| **BRIN** | very large append-only tables physically sorted by column (e.g. time-series logs) | MVs here are small (~600 rows) and not physically ordered by the query column. Selectivity would be near zero. Ruled out. |

---

## 2. Access pattern audit

Every integration file (`dashboard.py`, `player_page.py`, `teams.py`, `search.py`, `reported_injuries.py`, `my_players.py`) was inspected to derive this table:

| View | Current query pattern | Index needed? |
|---|---|---|
| `mv_player_card` | `WHERE player_id = :pid` (one row per player page load) | **Yes — unique B-tree on `player_id`** |
| `mv_injury_analysis` | `WHERE player_id = :pid` (one row per player page load) | **Yes — unique B-tree on `player_id`** |
| `mv_team_player_list` | `WHERE team_id = :tid` (roster per team) | **Yes — B-tree on `team_id`** |
| `mv_high_risk_players` | **two paths:** global → `WHERE player_injury_risk > 0.50`; favourites → `JOIN user_favourite ON player_id` | **Yes — B-tree on `player_injury_risk` + unique B-tree on `player_id`** |
| `mv_trending_risk_players` | **two paths:** global → `WHERE player_injury_trend > 30`; favourites → `JOIN user_favourite ON player_id` | **Yes — B-tree on `player_injury_trend` + unique B-tree on `player_id`** |
| `mv_search_players` | full scan, by design — frontend gets the entire player list to drive client-side search | **No** — the result *is* the whole view, an index would never be picked |
| `mv_teams_overview` | full scan, by design — entire 20-team overview always returned | **No** — same reasoning, plus only 20 rows |
| `mv_game_week_matches` | full scan (~10 rows per gameweek) | No — dataset too small |
| `mv_reported_injuries` | full scan, ordered by date | No — full result always returned |

---

## 3. Phase 1 — confirmed point-lookup indexes

All index creation goes inside `create_views.py` immediately after the corresponding `CREATE MATERIALIZED VIEW` statement.

### 3.1 `mv_player_card` — unique B-tree on `player_id`

Each player page calls `SELECT * FROM mv_player_card WHERE player_id = :pid`. Without an index PostgreSQL seqscans ~600 rows. With a unique B-tree it does a single index lookup.

```python
def _create_mv_player_card(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_player_card AS
        ...
    """))
    conn.execute(text("""
        CREATE UNIQUE INDEX idx_mv_player_card_player_id
        ON mv_player_card (player_id)
    """))
```

**Type:** unique B-tree (the MV has exactly one row per `player_id`, so UNIQUE is correct and lets the planner treat this as a guaranteed single-row fetch).

### 3.2 `mv_injury_analysis` — unique B-tree on `player_id`

Same pattern as above — `SELECT * FROM mv_injury_analysis WHERE player_id = :pid` on every player page.

```python
def _create_mv_injury_analysis(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_injury_analysis AS
        ...
    """))
    conn.execute(text("""
        CREATE UNIQUE INDEX idx_mv_injury_analysis_player_id
        ON mv_injury_analysis (player_id)
    """))
```

**Type:** unique B-tree — same reasoning as `mv_player_card`.

### 3.3 `mv_team_player_list` — B-tree on `team_id`

`SELECT * FROM mv_team_player_list WHERE team_id = :tid` fetches a roster (~25 rows out of ~600). A non-unique B-tree lets the planner do an index scan and return only the matching team's rows.

```python
def _create_mv_team_player_list(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_team_player_list AS
        ...
    """))
    conn.execute(text("""
        CREATE INDEX idx_mv_team_player_list_team_id
        ON mv_team_player_list (team_id)
    """))
```

**Type:** non-unique B-tree — multiple players share the same `team_id` so UNIQUE would be wrong. B-tree gives O(log n) access to the correct team's rows.

---

## 4. Phase 2 — dashboard dual-path indexes

### 4.1 `mv_high_risk_players` — B-tree on `player_injury_risk` + unique B-tree on `player_id`

`integration/dashboard.py` has two distinct query paths:

```python
# Global scope — range filter
SELECT * FROM mv_high_risk_players WHERE player_injury_risk > 0.50
# User favourites scope — equality JOIN
SELECT mv.* FROM mv_high_risk_players mv
JOIN user_favourite uf ON uf.player_id = mv.player_id AND uf.user_id = :uid
```

Each path needs its own index:
- `player_injury_risk` index serves the `> 0.50` range scan — B-tree handles `>` / `<` / `BETWEEN` natively. Hash would be useless here.
- `player_id` unique index serves the favourites JOIN — equality lookup driven by the small `user_favourite` row set.

```python
def _create_mv_high_risk_players(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_high_risk_players AS
        ...
    """))
    conn.execute(text("""
        CREATE UNIQUE INDEX idx_mv_high_risk_players_player_id
        ON mv_high_risk_players (player_id)
    """))
    conn.execute(text("""
        CREATE INDEX idx_mv_high_risk_players_risk
        ON mv_high_risk_players (player_injury_risk)
    """))
```

**Selectivity note:** the index on `player_injury_risk` only beats a seqscan when the filter returns a small minority of rows. The MV definition already excludes `player_injury_risk >= 0.99`, so values lie in [0, 0.99). If `> 0.50` matches more than ~20% of the ~600 rows, the planner may still seqscan — but that's the planner's call, and the index is cheap (one entry per player).

### 4.2 `mv_trending_risk_players` — B-tree on `player_injury_trend` + unique B-tree on `player_id`

Same dual-path pattern as `mv_high_risk_players`:

```python
# Global scope — range filter
SELECT * FROM mv_trending_risk_players WHERE player_injury_trend > 30
# User favourites scope — equality JOIN
SELECT mv.* FROM mv_trending_risk_players mv
JOIN user_favourite uf ON uf.player_id = mv.player_id AND uf.user_id = :uid
```

```python
def _create_mv_trending_risk_players(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_trending_risk_players AS
        ...
    """))
    conn.execute(text("""
        CREATE UNIQUE INDEX idx_mv_trending_risk_players_player_id
        ON mv_trending_risk_players (player_id)
    """))
    conn.execute(text("""
        CREATE INDEX idx_mv_trending_risk_players_trend
        ON mv_trending_risk_players (player_injury_trend)
    """))
```

---

## 5. Risks & verification

### 5.1 `UNIQUE` index assumptions — depends on ML-team upstream fix

A `CREATE UNIQUE INDEX` will **fail at index creation time** if the MV contains duplicate rows for the indexed column.

| View | Status |
|---|---|
| `mv_player_card` | ⚠️ Safe **only after** the ML upstream dedup lands |
| `mv_injury_analysis` | ⚠️ Safe **only after** the ML upstream dedup lands |
| `mv_high_risk_players` | ✅ Safe today — no `latest_season_stats` join |
| `mv_trending_risk_players` | ✅ Safe today — `JOIN graph_data` is 1:1 per player |

**Finding (audit of `output/predictions.json`):**

The current `predictions.json` contains:
- **162 duplicate `(player_id, season_year)` pairs** across 135 players
- **36 players** whose duplicate falls on their *latest* year

Most are mid-season transfers (e.g. Evann Guessand 2025: 13 apps + 6 apps), loan recalls, or youth-team listings (e.g. Thomas Davies 2023: an all-None row alongside his real Everton stats). API-Football emits one row per `(team × league × season)` tuple, which is what generates the duplicates.

Because both `mv_player_card` and `mv_injury_analysis` build a `latest_season_stats` CTE that filters `player_season` to the latest year and LEFT JOINs to `player`, those 36 players currently end up with **two MV rows** — which would make `CREATE UNIQUE INDEX ... ON (player_id)` fail.

**Resolution:** the ML team has been notified and is updating the pipeline to emit at most one `season_stats` entry per `(player_id, season_year)`. Once that lands and a fresh `predictions.json` is ingested, the unique-index assumption holds and Phase 1 can proceed unblocked.

**Ordering — must be done in this sequence:**
1. ML team ships dedup upstream → new `predictions.json` available
2. Run `python server/ingest_predictions.py` to load the clean data
3. Sanity-check there are no duplicates: `SELECT player_id, player_season_year, COUNT(*) FROM player_season GROUP BY 1, 2 HAVING COUNT(*) > 1;` should return 0 rows
4. **Then** add the Phase 1 / Phase 2 indexes from this plan and re-run the ingestor

**Defensive recommendation:** add a DB-level `UNIQUE (player_id, player_season_year)` constraint to the `player_season` table at the same time. That way if the upstream pipeline ever regresses, the ingestor fails loudly at insert time rather than silently producing duplicate MV rows again. This is a one-line addition to the `PlayerSeason` model in [database_init.py](server/database_init.py).

**Side note on the live bug:** the same 36 players currently have *doubled* `player_season_minutes` and other LEFT-JOIN-multiplied fields on `GET /players/{id}/card`. Worse, `integration/player_page.py:128` calls `.mappings().one_or_none()` on that query — SQLAlchemy raises `MultipleResultsFound` when more than one row matches, so the endpoint already 500s for those 36 players. Fixing the data fixes both.

### 5.2 Bonus benefit of `UNIQUE` indexes — `REFRESH ... CONCURRENTLY`

A unique index on a materialized view enables `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_x`, which refreshes the view without blocking concurrent reads. Today the ingestor drops & recreates the MVs, so this isn't used — but if the team ever switches to incremental refreshes (e.g. nightly cron without taking the API offline), this becomes free.

### 5.3 Out of scope but related: `user_favourite` base-table indexes

The favourites query path in `dashboard.py:65-73` and the entire `my_players.get_favourite_players` function filter `user_favourite` by `user_id` and JOIN on `player_id`:

```sql
JOIN user_favourite uf ON uf.player_id = mv.player_id AND uf.user_id = :uid
```

The MV-side `(player_id)` index helps the lookup direction, but the planner also needs to find the user's favourites quickly. A composite B-tree `user_favourite (user_id, player_id)` on the base table would close the loop. **Not part of this MV-indexes plan**, but the favourites perf gain is half-realized without it.

### 5.4 All MV indexes must live inside `create_views.py`

The ingestor drops every materialized view at the start of each run ([ingest_predictions.py:113-122](server/ingest_predictions.py:113)). PostgreSQL drops dependent indexes automatically when their MV is dropped, which is **good** — it means indexes defined inside `create_views.py` are guaranteed to be in sync with the views. But it also means any index created manually via `psql` against an MV will silently disappear on the next ingest. Add a comment at the top of `create_views.py` to make this explicit for future contributors.

### 5.5 Selectivity sanity check for range indexes

The B-tree indexes on `player_injury_risk` and `player_injury_trend` only beat seqscan when the filter returns a small minority of rows. With ~600 players in the MV:

- `player_injury_risk > 0.50`: needs ≲120 matching rows for the planner to prefer the index.
- `player_injury_trend > 30`: same threshold.

If most rows cluster above the threshold, the planner will (correctly) choose seqscan and the indexes go unused. They still won't *hurt* — they just won't be picked. After ingest, run:

```sql
EXPLAIN SELECT * FROM mv_high_risk_players WHERE player_injury_risk > 0.50;
```

to confirm the planner picks `Index Scan` over `Seq Scan`.

---

## 6. TL;DR checklist

**Phase 1 — point-lookup indexes:**
- [ ] **Prerequisite:** ML team's upstream `season_stats` dedup must be live in `predictions.json` (see §5.1)
- [ ] **Prerequisite:** verify with `SELECT player_id, player_season_year, COUNT(*) FROM player_season GROUP BY 1, 2 HAVING COUNT(*) > 1;` → 0 rows
- [ ] (Defensive) add `UniqueConstraint("player_id", "player_season_year")` to `PlayerSeason.__table_args__` in `server/database_init.py`
- [ ] Add `CREATE UNIQUE INDEX idx_mv_player_card_player_id` after `mv_player_card` creation in `server/create_views.py`
- [ ] Add `CREATE UNIQUE INDEX idx_mv_injury_analysis_player_id` after `mv_injury_analysis` creation in `server/create_views.py`
- [ ] Add `CREATE INDEX idx_mv_team_player_list_team_id` after `mv_team_player_list` creation in `server/create_views.py`
- [ ] Run `python server/ingest_predictions.py`
- [ ] Smoke-test `GET /players/{id}/card`
- [ ] Smoke-test `GET /players/{id}/injury-analysis`
- [ ] Smoke-test `GET /players/team/{team_id}`
- [ ] `EXPLAIN SELECT * FROM mv_team_player_list WHERE team_id = 1;` → confirm `Index Scan` (≈5% selectivity, should win)

**Phase 2 — dashboard dual-path indexes:**
- [ ] Add `CREATE UNIQUE INDEX idx_mv_high_risk_players_player_id` + `CREATE INDEX idx_mv_high_risk_players_risk` after `mv_high_risk_players` creation in `server/create_views.py`
- [ ] Add `CREATE UNIQUE INDEX idx_mv_trending_risk_players_player_id` + `CREATE INDEX idx_mv_trending_risk_players_trend` after `mv_trending_risk_players` creation in `server/create_views.py`
- [ ] Run `python server/ingest_predictions.py`
- [ ] `EXPLAIN` both range queries to confirm `Index Scan` is chosen
- [ ] Smoke-test `GET /dashboard/high-risk-players` (global + with `?user_id=` param)
- [ ] Smoke-test `GET /dashboard/trending-risk-players` (global + with `?user_id=` param)
