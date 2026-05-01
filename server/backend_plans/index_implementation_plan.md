# Index Implementation Plan

**Goal:** Add B-tree (and a small number of partial / unique) indexes on materialized views and base tables so that every endpoint's `SELECT` switches from a sequential scan to an index scan, and capture before/after `EXPLAIN ANALYZE` numbers to verify the win.

- **Phase 0** — All materialized-view work, executed in this order so each step's prerequisites are already in place:

  **Step 0a — `server/create_views.py`** (schema + MV indexes; nothing else yet reads or writes against the new shape):
  - Add the new `mv_injury_history` MV. Its `SELECT` list must include `pi.player_injury_id` so we can build a UNIQUE index on it. Create both `idx_mv_ih_player_start` on `(player_id, player_injury_start DESC)` (query path) and `uq_mv_ih_injury_id` UNIQUE on `(player_injury_id)` (concurrent-refresh enabler — a unique index on `(player_id, player_injury_start)` is impossible because the data has 12 same-day duplicates).
  - **Merge `mv_high_risk_players` and `mv_trending_risk_players` into a single `mv_player_overview`** that carries both `player_injury_risk` and `player_injury_trend` alongside the shared identity columns (names, photo, team, position, seasonal_injuries). Drop `_create_mv_high_risk_players(...)`; rewrite `_create_mv_trending_risk_players(...)` as `_create_mv_player_overview(...)`. Keep `INNER JOIN graph_data` (data confirms zero orphans; ingest writes a graph row for every non-skipped player). The merged MV must use the more inclusive row set (i.e. *not* filter out `player_injury_risk >= 0.99` — currently only the high-risk MV does that, and applying it here would silently drop already-injured players from the trending and favourites endpoints). Add `uq_mv_po_player_id`, `idx_mv_po_risk`, `idx_mv_po_trend`.
  - Add the remaining MV indexes alongside the existing MV definitions: `idx_mv_tpl_team_risk` on `mv_team_player_list(team_id, player_injury_risk DESC)`, `idx_mv_sp_last_name` on `mv_search_players(player_last_name)`, `uq_mv_pc_player_id` on `mv_player_card`, `uq_mv_ia_player_id` on `mv_injury_analysis`, `idx_mv_ri_start_desc` on `mv_reported_injuries`.
  - Wire `_create_mv_injury_history(...)` and `_create_mv_player_overview(...)` into `create_all_views(...)`; remove the dropped `_create_mv_high_risk_players(...)` / `_create_mv_trending_risk_players(...)` calls. **Call order is load-bearing:** `_create_mv_player_overview` joins `mv_teams_overview`, so it must be placed **after** `_create_mv_teams_overview(conn)` — placing it before will cause `CREATE MATERIALIZED VIEW` to fail on the missing relation.

  **Step 0b — `server/ingest_predictions.py`** (must land before the next re-ingest, which is what builds the new MVs):
  - Update the MV drop list (lines 114–119) to match the new inventory: remove `"mv_high_risk_players"` and `"mv_trending_risk_players"`; add `"mv_player_overview"` and `"mv_injury_history"`. Without this fix the re-ingest in Step 0d will silently leak stale views.
  - **Drop order is load-bearing:** `mv_player_overview` depends on `mv_teams_overview` (it joins it). Place `"mv_player_overview"` in the **first group** of the drop tuple — before `"mv_teams_overview"` — otherwise `DROP MATERIALIZED VIEW IF EXISTS mv_teams_overview` will fail with a dependency error (no CASCADE is used). `"mv_injury_history"` has no dependency on `mv_teams_overview` so its position is flexible.

  **Step 0c — integration layer** (now safe because Steps 0a + 0b are landed; the new MVs will exist as soon as the next ingest runs):
  - Switch `integration/player_page.get_injury_history(...)` to `SELECT * FROM mv_injury_history WHERE player_id = :pid`.
  - Update `integration/dashboard.get_high_risk_players(...)` query to `… FROM mv_player_overview WHERE player_injury_risk > 0.10 AND player_injury_risk < 0.99 ORDER BY player_injury_risk DESC` (and the `?user_id` variant accordingly).
  - Update `integration/dashboard.get_trending_risk_players(...)` query to `… FROM mv_player_overview WHERE player_injury_trend > 30 ORDER BY player_injury_trend DESC` (and the `?user_id` variant accordingly).
  - Refactor `integration/my_players.get_favourite_players(...)` to `SELECT mv.* FROM mv_player_overview mv JOIN user_favourite uf ON uf.player_id = mv.player_id AND uf.user_id = :uid` (replaces today's 6-way join). Update the `FavouritePlayer` TypedDict + response mapping to include `player_injury_risk` alongside `player_injury_trend`.
  - Add explicit `ORDER BY player_injury_risk DESC` to `integration/player_page.get_team_player_list(...)` and explicit `ORDER BY player_last_name` to `integration/search.get_search_players(...)` — the `ORDER BY` baked into MV definitions is not preserved across reads.

  **Step 0d — re-ingest** to materialize the new schema:
  - Run `cd server && python ingest_predictions.py`. Verify the printed view-drop list mentions `mv_player_overview` and `mv_injury_history`, and that all endpoints continue to return data.
- **Phase 1** — Baseline. Capture current `EXPLAIN ANALYZE` timings on the live `test` DB (this file, section 3).
- **Phase 2** — Add base-table indexes (FKs and hot filters) inside `database_init.py` so they live with the schema.
- **Phase 3** — Re-run `EXPLAIN ANALYZE` and fill in the "After" column in section 3. Drop / rework any index that does not move the plan to an Index Scan.

---

## 1. The problem today

```
endpoint  ──►  SELECT * FROM mv_x WHERE col = $1
                                 │
                                 └──►  Seq Scan on mv_x          ← every row read
                                              │
                                              └──►  Filter: col = $1
                                                          │
                                                          └──►  Rows Removed by Filter: ~all
```

```
existing indexes (public schema):
  app_user_pkey, graph_data_pkey, match_pkey, nation_pkey,
  player_pkey, player_injury_pkey, player_season_pkey,
  season_meta_pkey, team_pkey, user_favourite_pkey
```

**The gap:** only primary keys are indexed. Every FK lookup (`player_season.player_id`, `player_injury.player_season_id`, `user_favourite.user_id`, `match.home_team_id`/`away_team_id`, `graph_data.player_id`, `player.team_id`) and every filter on a materialized view (`mv_*.player_id`, `mv_team_player_list.team_id`, `mv_high_risk_players.player_injury_risk`, etc.) goes through a sequential scan. At today's row counts (player=973, player_season=2 475, player_injury=6 405, mv_reported_injuries=4 718) the absolute timings are still sub‑millisecond, but the same plans degrade linearly as the DB grows toward a full Premier League season.

---

## 2. All affected endpoints, queries & suggested indexes

| #  | Endpoint                                          | Query target                                       | Filter / join keys                                              | Suggested index                                                          | Type                  | Status |
|----|---------------------------------------------------|----------------------------------------------------|-----------------------------------------------------------------|--------------------------------------------------------------------------|-----------------------|--------|
| 1  | `GET /dashboard/matches`                          | `mv_game_week_matches` (full scan)                 | none — returns all rows                                         | none (full scan is correct for ~10 rows)                                  | —                     | ⬜     |
| 2  | `GET /dashboard/high-risk-players`                | `mv_player_overview` (merged in Phase 0)           | `WHERE player_injury_risk > 0.10 AND player_injury_risk < 0.99 ORDER BY player_injury_risk DESC` | `idx_mv_po_risk` on `(player_injury_risk DESC)`                          | B-tree                | ⬜     |
| 3  | `GET /dashboard/high-risk-players?user_id`        | `mv_player_overview` ⋈ `user_favourite`            | `uf.user_id = ?`, `uf.player_id = mv.player_id`                 | `idx_uf_user_id` on `user_favourite(user_id)`; `uq_mv_po_player_id`      | B-tree                | ⬜     |
| 4  | `GET /dashboard/trending-risk-players`            | `mv_player_overview`                               | `WHERE player_injury_trend > 30 ORDER BY player_injury_trend DESC` | `idx_mv_po_trend` on `(player_injury_trend DESC)`                        | B-tree                | ⬜     |
| 5  | `GET /dashboard/trending-risk-players?user_id`    | `mv_player_overview` ⋈ `user_favourite`            | `uf.user_id = ?`                                                | reuses `idx_uf_user_id` + `uq_mv_po_player_id`                           | B-tree                | ⬜     |
| 6  | `GET /teams/overview`                             | `mv_teams_overview` (full scan)                    | none                                                            | none (only ~20 rows)                                                     | —                     | ⬜     |
| 7  | `GET /search/players`                             | `mv_search_players`                                | full scan + explicit `ORDER BY player_last_name` (frontend requirement)  | `idx_mv_sp_last_name` on `(player_last_name)`                            | B-tree                | ⬜     |
| 8  | `GET /search/teams`                               | `mv_teams_overview` `ORDER BY team_name`           | none                                                            | none (sort over 20 rows)                                                 | —                     | ⬜     |
| 9  | `GET /search/injury-regions`                      | `player_injury` `DISTINCT player_injury_region`    | grouping on region                                              | none — endpoint returns the full distinct list, full scan is correct      | —                     | ⬜     |
| 10 | `GET /players/team/{team_id}`                     | `mv_team_player_list`                              | `WHERE team_id = ?` + explicit `ORDER BY player_injury_risk DESC` (frontend requirement) | `idx_mv_tpl_team_risk` on `(team_id, player_injury_risk DESC)`           | B-tree composite      | ⬜     |
| 11 | `GET /players/{player_id}/card`                   | `mv_player_card`                                   | `WHERE player_id = ?` (one row)                                 | `uq_mv_pc_player_id` on `(player_id)`                                    | B-tree UNIQUE         | ⬜     |
| 12 | `GET /players/{player_id}/graph`                  | `graph_data`                                       | `WHERE player_id = ?`                                           | `uq_gd_player_id` on `graph_data(player_id)`                             | B-tree UNIQUE         | ⬜     |
| 13 | `GET /players/{player_id}/seasons`                | `player_season` ordered by year DESC               | `WHERE player_id = ?`                                           | `idx_ps_player_year` on `(player_id, player_season_year DESC)`           | B-tree composite      | ⬜     |
| 14 | `GET /players/{player_id}/injury-history`         | new `mv_injury_history` (pre-joined `player_injury` ⋈ `player_season`, includes `pi.player_injury_id`, refreshed nightly with the rest of the DB) | `WHERE player_id = ?`, `ORDER BY player_injury_start DESC` | `idx_mv_ih_player_start` on `(player_id, player_injury_start DESC)` (query path) **+** `uq_mv_ih_injury_id` UNIQUE on `(player_injury_id)` (concurrent-refresh enabler) | B-tree composite + B-tree UNIQUE | ⬜     |
| 15 | `GET /players/{player_id}/injury-analysis`        | `mv_injury_analysis`                               | `WHERE player_id = ?`                                           | `uq_mv_ia_player_id` on `(player_id)`                                    | B-tree UNIQUE         | ⬜     |
| 16 | `GET /reported-injuries/`                         | `mv_reported_injuries` (full scan, 4 718 rows)     | none, ordered by `player_injury_start DESC` in MV               | `idx_mv_ri_start_desc` on `(player_injury_start DESC)` (helps once we add LIMIT/pagination) | B-tree                | ⬜     |
| 17 | `GET /my-players/{user_id}`                       | `mv_player_overview` ⋈ `user_favourite`            | `uf.user_id = ?`, `uf.player_id = mv.player_id`                 | reuses `idx_uf_user_id` + `uq_mv_po_player_id` already planned for endpoint #5 | B-tree                | ⬜     |

### Materialized-view indexes (consolidated, in `create_views.py`)

| MV                              | Index name                  | Columns                              | Type            |
|---------------------------------|-----------------------------|--------------------------------------|-----------------|
| `mv_player_overview` *(merged in Phase 0)* | `uq_mv_po_player_id` | `(player_id)`                        | B-tree UNIQUE   |
| `mv_player_overview`            | `idx_mv_po_risk`            | `(player_injury_risk DESC)`          | B-tree          |
| `mv_player_overview`            | `idx_mv_po_trend`           | `(player_injury_trend DESC)`         | B-tree          |
| `mv_team_player_list`           | `idx_mv_tpl_team_risk`      | `(team_id, player_injury_risk DESC)` | B-tree composite |
| `mv_player_card`                | `uq_mv_pc_player_id`        | `(player_id)`                        | B-tree UNIQUE   |
| `mv_injury_analysis`            | `uq_mv_ia_player_id`        | `(player_id)`                        | B-tree UNIQUE   |
| `mv_reported_injuries`          | `idx_mv_ri_start_desc`      | `(player_injury_start DESC)`         | B-tree          |
| **new** `mv_injury_history`     | `idx_mv_ih_player_start`    | `(player_id, player_injury_start DESC)` | B-tree composite |
| **new** `mv_injury_history`     | `uq_mv_ih_injury_id`        | `(player_injury_id)`                 | B-tree UNIQUE   |
| `mv_search_players`             | `idx_mv_sp_last_name`       | `(player_last_name)`                 | B-tree          |
| `mv_teams_overview`             | (none — too small)          | —                                    | —               |
| `mv_game_week_matches`          | (none — too small)          | —                                    | —               |

> Note: a UNIQUE index on an MV is also a prerequisite for `REFRESH MATERIALIZED VIEW CONCURRENTLY`, so the unique-on-`player_id` rows above double as future-proofing for online refresh.

### Base-table indexes (consolidated, in `database_init.py`)

| Table             | Index name              | Columns                                       | Type                  |
|-------------------|-------------------------|-----------------------------------------------|-----------------------|
| `user_favourite`  | `idx_uf_user_id`        | `(user_id)`                                   | B-tree                |
| `user_favourite`  | `idx_uf_player_id`      | `(player_id)`                                 | B-tree                |
| `player`          | `idx_p_team_id`         | `(team_id)`                                   | B-tree                |
| `player_season`   | `idx_ps_player_year`    | `(player_id, player_season_year DESC)`        | B-tree composite      |
| `player_injury`   | `idx_pi_season_id`      | `(player_season_id)`                          | B-tree                |
| `graph_data`      | `uq_gd_player_id`       | `(player_id)`                                 | B-tree UNIQUE         |
| `match`           | `idx_match_home_team`   | `(home_team_id)`                              | B-tree                |
| `match`           | `idx_match_away_team`   | `(away_team_id)`                              | B-tree                |
| `match`           | `idx_match_game_week`   | `(match_game_week)`                           | B-tree                |

All indexes default to B-tree because every filter is equality or range / ordered scan. No GIN / GiST / BRIN candidates: there is no full-text search, no array column, and no naturally clustered append-only column at the volumes we have.

---

## 3. Baseline timings (Phase 1 — captured 2026‑04‑30 against `test` DB)

DB sizes at capture time: player=973, player_season=2 475, player_injury=6 405, team=27, match=40, user_favourite=0, mv_reported_injuries=4 718. Sample IDs used: `player_id=2999`, `team_id=41`, `user_id=1`. Each row reports **Planning + Execution** time from `EXPLAIN (ANALYZE, BUFFERS)`.

| #  | Endpoint                                          | Plan today                              | Planning ms | Execution ms | Total ms | After (Phase 3) |
|----|---------------------------------------------------|-----------------------------------------|-------------|--------------|----------|------------------|
| 1  | `/dashboard/matches`                              | Seq Scan on mv (10 rows)                | 0.346       | 0.190        | 0.536    |                  |
| 2  | `/dashboard/high-risk-players`                    | Seq Scan + filter (33/547)              | 1.573       | 0.725        | 2.298    |                  |
| 3  | `/dashboard/high-risk-players?user_id=1`          | Hash Join, both sides Seq Scan          | 1.109       | 0.021        | 1.130    |                  |
| 4  | `/dashboard/trending-risk-players`                | Seq Scan + filter (20/649)              | 0.249       | 0.691        | 0.940    |                  |
| 5  | `/dashboard/trending-risk-players?user_id=1`      | Hash Join, both sides Seq Scan          | 0.059       | 0.017        | 0.076    |                  |
| 6  | `/teams/overview`                                 | Seq Scan on mv (20 rows)                | 0.080       | 0.206        | 0.286    |                  |
| 7  | `/search/players`                                 | Seq Scan on mv (649 rows)               | 0.073       | 0.478        | 0.551    |                  |
| 8  | `/search/teams`                                   | Seq Scan + Sort on mv (20 rows)         | 0.021       | 0.847        | 0.868    |                  |
| 9  | `/search/injury-regions`                          | Seq Scan + HashAggregate + Sort         | 0.091       | 0.881        | 0.972    |                  |
| 10 | `/players/team/{team_id}`                         | Seq Scan + filter on mv                 | 0.273       | 0.621        | 0.894    |                  |
| 11 | `/players/{player_id}/card`                       | Seq Scan + filter on mv (1/1010)        | 1.026       | 0.829        | 1.855    |                  |
| 12 | `/players/{player_id}/graph`                      | Seq Scan + filter on graph_data (1/973) | 1.063       | 0.759        | 1.822    |                  |
| 13 | `/players/{player_id}/seasons`                    | Seq Scan + Sort on player_season        | 0.471       | 0.134        | 0.605    |                  |
| 14 | `/players/{player_id}/injury-history`             | Hash Join (Seq×2) + Sort                | 0.906       | 0.623        | 1.529    |                  |
| 15 | `/players/{player_id}/injury-analysis`            | Seq Scan + filter on mv (1/1005)        | 0.273       | 0.203        | 0.476    |                  |
| 16 | `/reported-injuries/`                             | Seq Scan on mv (4 718 rows)             | 0.178       | 1.651        | 1.829    |                  |
| 17 | `/my-players/{user_id}`                           | Nested Loop / Hash, all base seq scans  | 1.817       | 0.076        | 1.893    |                  |
|    | **TOTAL**                                         |                                         | **9.601**   | **8.950**    | **18.551** |                |

Raw output is preserved at `/tmp/explain_output.txt` (regenerable from `/tmp/explain_endpoints.sql`).

---

## 4. Phase 2 — base-table index DDL (preview)

**Before** (`database_init.py`): only PKs declared via `Field(primary_key=True)`.

**Import prerequisite:** `Index` and `text` are not currently imported in `database_init.py`. Add both before writing any `__table_args__` entries:

```python
from sqlalchemy import CheckConstraint, Identity, Column, Time, Numeric, Index, text
```

**`__table_args__` extension rule:** `GraphData` already has a `__table_args__` tuple containing `CheckConstraint('chk_gw_risk_range')`. Adding `uq_gd_player_id` **must extend that tuple**, not replace it — overwriting `__table_args__` silently drops the check constraint from the schema on the next `database_init.py` run. Correct form:

```python
__table_args__: ClassVar[tuple] = (
    CheckConstraint(
        ' AND '.join(f'gw_{i} BETWEEN 0 AND 1' for i in range(1, 39)),
        name='chk_gw_risk_range'
    ),
    Index("uq_gd_player_id", "player_id", unique=True),
)
```

**After**: add `Index(...)` definitions inside each model's `__table_args__`, e.g.

```python
# player_season
__table_args__: ClassVar[tuple] = (
    Index("idx_ps_player_year", "player_id", text("player_season_year DESC")),
)
```

```python
# player_injury
__table_args__: ClassVar[tuple] = (
    Index("idx_pi_season_id", "player_season_id"),
)
```

```python
# user_favourite
__table_args__: ClassVar[tuple] = (
    Index("idx_uf_user_id",   "user_id"),
    Index("idx_uf_player_id", "player_id"),
)
```

…and analogous entries for `player(team_id)`, `graph_data(player_id) UNIQUE`, `match(home_team_id|away_team_id|match_game_week)`.

---

## 5. Phase 0 — materialized-view DDL (preview)

**Before** (`create_views.py`): each `_create_mv_*` ends after `CREATE MATERIALIZED VIEW ...`.

**After**: append `CREATE [UNIQUE] INDEX ...` calls in the same transaction, e.g.

```python
def _create_mv_player_card(conn: Connection) -> None:
    conn.execute(text("CREATE MATERIALIZED VIEW mv_player_card AS ..."))
    conn.execute(text("CREATE UNIQUE INDEX uq_mv_pc_player_id ON mv_player_card (player_id)"))
```

```python
def _create_mv_team_player_list(conn: Connection) -> None:
    conn.execute(text("CREATE MATERIALIZED VIEW mv_team_player_list AS ..."))
    conn.execute(text(
        "CREATE INDEX idx_mv_tpl_team_risk "
        "ON mv_team_player_list (team_id, player_injury_risk DESC)"
    ))
```

**New MV — `mv_injury_history`**: replaces the live `player_injury ⋈ player_season` join used by `/players/{player_id}/injury-history`. Safe to materialize because the DB is read-only between nightly ingests. The MV must include `pi.player_injury_id` so we can build a UNIQUE index on it (a unique index on `(player_id, player_injury_start)` is impossible — data has 12 same-day duplicates).

```python
def _create_mv_injury_history(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_injury_history AS
        SELECT
            pi.player_injury_id,
            ps.player_id,
            pi.player_injury_type,
            pi.player_injury_region,
            pi.player_injury_start,
            pi.player_injury_end,
            pi.player_injury_severity,
            pi.player_injury_days_out
        FROM player_injury pi
        JOIN player_season ps ON ps.player_season_id = pi.player_season_id
        ORDER BY pi.player_injury_start DESC
    """))
    conn.execute(text(
        "CREATE INDEX idx_mv_ih_player_start "
        "ON mv_injury_history (player_id, player_injury_start DESC)"
    ))
    conn.execute(text(
        "CREATE UNIQUE INDEX uq_mv_ih_injury_id "
        "ON mv_injury_history (player_injury_id)"
    ))
```

Add the call to `create_all_views(...)` and update `integration/player_page.get_injury_history(...)` to read from the MV:

```python
rows = session.execute(
    text("SELECT * FROM mv_injury_history WHERE player_id = :pid"),
    {"pid": player_id}
).mappings().all()
```

The composite `(player_id, player_injury_start DESC)` index lets Postgres satisfy both `WHERE player_id = $1` and `ORDER BY player_injury_start DESC` in a single Index Scan — no Sort step, no nested loop.

…and the rest per the table in section 2.

---

## 6. TL;DR checklist

**Phase 0 — All materialized-view work** (`server/create_views.py` → `server/ingest_predictions.py` → integration layer → re-ingest)

*Prerequisite — verify no duplicate `(player_id, season_year)` rows*
- [ ] Run against the live DB: `SELECT player_id, player_season_year, COUNT(*) FROM player_season GROUP BY 1, 2 HAVING COUNT(*) > 1;` → must return 0 rows. If rows are returned, the ML pipeline is still emitting duplicate season entries (e.g. mid-season transfers, loan recalls). `CREATE UNIQUE INDEX uq_mv_pc_player_id` and `uq_mv_ia_player_id` will hard-fail at ingest time until this is clean, because both `mv_player_card` and `mv_injury_analysis` fan out on duplicate `player_season` rows and end up with two MV rows per affected `player_id`. Notify the ML team and wait for a clean `predictions.json` before proceeding.

*Step 0a — `server/create_views.py`*
- [ ] Add `_create_mv_injury_history(...)`. The MV's `SELECT` list **must include `pi.player_injury_id`** so we can build a UNIQUE index on it (a unique index on `(player_id, player_injury_start)` is impossible — data has 12 same-day duplicates).
- [ ] Inside `_create_mv_injury_history(...)`, create both indexes: `idx_mv_ih_player_start` on `(player_id, player_injury_start DESC)` (query path) **and** `uq_mv_ih_injury_id` UNIQUE on `(player_injury_id)` (concurrent-refresh enabler).
- [ ] Replace `_create_mv_high_risk_players(...)` and `_create_mv_trending_risk_players(...)` with a single `_create_mv_player_overview(...)` carrying both `player_injury_risk` and `player_injury_trend`; do NOT carry over the `player_injury_risk < 0.99` filter — apply it at endpoint level instead. **Keep `INNER JOIN graph_data`** (matches today's `mv_trending_risk_players`; data check confirms 0 orphan players, and the ingest in `ingest_predictions.py:302` writes a `graph_data` row for every non-skipped player so the invariant is enforced upstream).
- [ ] Add `uq_mv_po_player_id` + `idx_mv_po_risk` + `idx_mv_po_trend` on `mv_player_overview` inside the same `_create_mv_player_overview(...)` function.
- [ ] Add `idx_mv_tpl_team_risk` on `mv_team_player_list(team_id, player_injury_risk DESC)` inside `_create_mv_team_player_list(...)`.
- [ ] Add `idx_mv_sp_last_name` on `mv_search_players(player_last_name)` inside `_create_mv_search_players(...)`.
- [ ] Add `uq_mv_pc_player_id` on `mv_player_card` inside `_create_mv_player_card(...)`.
- [ ] Add `uq_mv_ia_player_id` on `mv_injury_analysis` inside `_create_mv_injury_analysis(...)`.
- [ ] Add `idx_mv_ri_start_desc` on `mv_reported_injuries` inside `_create_mv_reported_injuries(...)` (preparatory — does not change today's plan; pays off once `/reported-injuries/` adds pagination, tracked as `FE-3` in `server/backend_plans/future_errors.md`).
- [ ] Wire `_create_mv_injury_history(...)` and `_create_mv_player_overview(...)` into `create_all_views(...)`; remove the calls to the dropped `_create_mv_high_risk_players(...)` / `_create_mv_trending_risk_players(...)`. Place `_create_mv_player_overview` **after** `_create_mv_teams_overview` — it depends on that MV and will error if called first.

*Step 0b — `server/ingest_predictions.py`*
- [ ] Update the MV drop list (lines 114–119) to match the new inventory: remove `"mv_high_risk_players"` and `"mv_trending_risk_players"`, add `"mv_player_overview"` and `"mv_injury_history"`. Without this fix, the next re-ingest will fail to drop the new views and silently leak stale ones. Place `"mv_player_overview"` in the **first group** of the drop tuple (before `"mv_teams_overview"`), since `mv_player_overview` joins `mv_teams_overview` — dropping `mv_teams_overview` first will fail without CASCADE. `"mv_injury_history"` has no such dependency and can go anywhere.

*Step 0c — integration layer*
- [ ] Switch `integration/player_page.get_injury_history(...)` to `SELECT * FROM mv_injury_history WHERE player_id = :pid`.
- [ ] Update `integration/dashboard.get_high_risk_players(...)` query to `… FROM mv_player_overview WHERE player_injury_risk > 0.10 AND player_injury_risk < 0.99 ORDER BY player_injury_risk DESC` (and the `?user_id` variant accordingly).
- [ ] Update `integration/dashboard.get_trending_risk_players(...)` query to `… FROM mv_player_overview WHERE player_injury_trend > 30 ORDER BY player_injury_trend DESC` (and the `?user_id` variant accordingly).
- [ ] Refactor `integration/my_players.get_favourite_players(...)` to `SELECT mv.* FROM mv_player_overview mv JOIN user_favourite uf ON uf.player_id = mv.player_id AND uf.user_id = :uid`; extend the `FavouritePlayer` TypedDict + response mapping to surface `player_injury_risk` alongside `player_injury_trend`. (Frontend type follow-up tracked as `FE-4` in `server/backend_plans/future_errors.md`.)
- [ ] Add explicit `ORDER BY player_injury_risk DESC` to the query in `integration/player_page.get_team_player_list(...)` (frontend renders the team list highest-risk-first; the `ORDER BY` baked into the MV definition is not preserved across reads).
- [ ] Add explicit `ORDER BY player_last_name` to the query in `integration/search.get_search_players(...)` (frontend expects alphabetical; same reason as above).

*Step 0d — re-ingest*
- [ ] Run `cd server && python ingest_predictions.py`. Verify the printed view-drop list includes `mv_player_overview` and `mv_injury_history`, and confirm every endpoint still returns data.

*Issues found while comparing the plan against the code/data — resolve or dismiss each*
- [x] ~~**`ingest_predictions.py` MV drop list (lines 114–119) hard-codes `mv_high_risk_players` and `mv_trending_risk_players`.**~~ Resolved → see "Ingest-script alignment" checkbox above.
- [x] ~~**`mv_injury_history` cannot have a UNIQUE index on `(player_id, player_injury_start)`**~~ Resolved → MV column list now includes `pi.player_injury_id` and a `uq_mv_ih_injury_id` UNIQUE index is added alongside `idx_mv_ih_player_start` (see `mv_injury_history` checkboxes above).
- [x] ~~**`mv_player_overview` `JOIN graph_data` semantics.**~~ Resolved → keeping `INNER JOIN graph_data` (data confirms zero orphans; ingest writes a graph row for every non-skipped player at `ingest_predictions.py:302`). Documented inline in the merge bullet above.
- [x] ~~**`mv_team_player_list` read-side ordering.**~~ Resolved → endpoint must order by `player_injury_risk DESC` (frontend requirement). Plan now uses composite `idx_mv_tpl_team_risk` and adds explicit `ORDER BY` in the integration query (see "Indexes on existing MVs" above).
- [x] ~~**`mv_search_players` read-side ordering.**~~ Resolved → endpoint must order alphabetically by `player_last_name`. Plan now adds `idx_mv_sp_last_name` and an explicit `ORDER BY` in the integration query (see "Indexes on existing MVs" above).
- [x] ~~**`uq_mv_pc_player_id`, `uq_mv_ia_player_id` UNIQUE assumption.**~~ Resolved → confirmed intentional. The UNIQUE constraint (a) acts as the index for endpoints #11 and #15, (b) physically prevents the MV from ever holding two rows for the same `player_id` — so a future edit to `_create_mv_player_card(...)` or `_create_mv_injury_analysis(...)` that accidentally fans out will fail at `REFRESH` time with a clear error instead of silently corrupting reads, and (c) is the prerequisite for `REFRESH MATERIALIZED VIEW CONCURRENTLY` later.
- [x] ~~**`uq_gd_player_id` UNIQUE on `graph_data(player_id)`.**~~ Resolved → adding the constraint is intentional. Acts as both an index (endpoint #12) and a DB-level enforcement of the one-graph-per-player invariant the ORM model already implies but never enforced. Data is already compliant (973/973 distinct).
- [x] ~~**`idx_mv_ri_start_desc` on `mv_reported_injuries` is preparatory.**~~ Resolved → keep the index as planned; pagination follow-up tracked as `FE-3` in `server/backend_plans/future_errors.md`.

**Phase 1 — Baseline**
- [x] Capture `EXPLAIN ANALYZE` numbers for all 17 endpoints (section 3).

**Phase 2 — Base-table indexes** (`server/database_init.py`)
- [ ] Add `Index` and `text` to the SQLAlchemy import line (they are not currently imported; omitting them causes `NameError` at load time)
- [ ] When adding `uq_gd_player_id` to `GraphData`, **extend** the existing `__table_args__` tuple — do not replace it. The existing `CheckConstraint('chk_gw_risk_range')` must be kept in the same tuple or it is silently dropped from the schema.
- [ ] `idx_uf_user_id`, `idx_uf_player_id` on `user_favourite`
- [ ] `idx_p_team_id` on `player`
- [ ] `idx_ps_player_year` on `player_season(player_id, player_season_year DESC)`
- [ ] `idx_pi_season_id` on `player_injury`
- [ ] `uq_gd_player_id` UNIQUE on `graph_data(player_id)`
- [ ] `idx_match_home_team`, `idx_match_away_team`, `idx_match_game_week` on `match`

**Phase 3 — Verify**
- [ ] Re-run `/tmp/explain_endpoints.sql`, fill the "After" column in section 3.
- [ ] Confirm each affected plan switched to Index Scan / Index Only Scan.
- [ ] Drop or rework any index that did not change the plan.
