# Future System Logic Errors

Known business-logic gaps that are not blocking current work but should be addressed in a future pass. Each entry describes the problem, the affected file/endpoint, and the suggested fix.

---

## FE-1 — `GET /search/injury-regions` returns regions from non-PL player injuries

**File:** `server/integration/search.py` — `get_injury_regions` (line 57)

**Problem:** The injury region dropdown is derived by querying `PlayerInjury.player_injury_region` directly with no player or team filter. After the DB bug-fixing plan is applied, `mv_reported_injuries` will only contain injuries for current-season PL players, but the region list is sourced from the raw table — it still includes regions that belong exclusively to non-PL or relegated-team players. A user could select a region in the filter dropdown and get zero results because all injuries with that region belong to players no longer shown in the view.

**Suggested fix:** Replace the raw `PlayerInjury` query with a query against `mv_reported_injuries` — `SELECT DISTINCT player_injury_region FROM mv_reported_injuries ORDER BY player_injury_region`. This guarantees the dropdown only shows regions that actually have matching rows in the injuries view.

---

## FE-2 — `GET /my-players` shows favourited players from relegated or non-PL clubs

**File:** `server/integration/my_players.py` — `get_favourite_players` (line 20)

**Problem:** The query is built directly against the `Player`, `Team`, and `GraphData` ORM models with no league filter. If a user has favourited a player who subsequently moved to a relegated club or left the league, that player continues to appear on their My Players page with potentially stale risk data.

**Why not fixed now:** This is a user-curated list. Auto-removing bookmarked players could surprise users and is a product decision, not a pure data-correctness fix. The current plan fixes all system-facing list and search endpoints; personal favourites are out of scope.

**Suggested fix:** After joining `Team`, add a sub-join or `WHERE` filter against `mv_teams_overview` to restrict to current PL teams — same pattern used in `mv_high_risk_players` and `mv_search_players` after the DB bug-fixing plan. Alternatively, surface a visual indicator in the frontend when a favourited player's team is no longer in `mv_teams_overview`, rather than silently removing them.

---

## FE-3 — `GET /reported-injuries/` returns the full list with no pagination

**File:** `server/integration/reported_injuries.py` — `get_reported_injuries` (line 21); `server/routers/reported_injuries.py` — `get_reported_injuries` (line 9)

**Problem:** The endpoint runs `SELECT * FROM mv_reported_injuries` and returns every row (~4 718 today, growing every game week). Without `LIMIT`/`OFFSET` the planner correctly picks a Seq Scan on the MV — the `idx_mv_ri_start_desc` index added in the index-implementation plan is preparatory and does not change the current plan. Frontend payload size is also unbounded.

**Why not fixed now:** The frontend currently renders the whole list at once and re-introducing pagination is a UI change, not a DB change. The index is shipped now so the DB side is ready as soon as the API/UI gain a `?limit=&offset=` (or cursor) parameter.

**Suggested fix:** Add `?limit` and `?offset` (or a cursor on `player_injury_start`) to `GET /reported-injuries/`, append `ORDER BY player_injury_start DESC LIMIT … OFFSET …` to the integration query, and verify the planner switches to `Index Scan using idx_mv_ri_start_desc`.

---

## FE-5 — `GET /my-players` uses a direct SQLAlchemy column select instead of a view

**File:** `server/integration/my_players.py` — `get_favourite_players` (line ~67)

**Problem:** Unlike every other integration layer, My Players queries the `Player` table directly via a SQLAlchemy column select rather than going through a materialized view. This means new columns added to the `Player` model (such as `player_relative_risk`) must be explicitly added to that query — they are not automatically included by view updates. It also means the query misses the pre-aggregated and pre-filtered data available in views like `mv_high_risk_players`.

**Why not fixed now:** Migrating My Players to a dedicated materialized view is a standalone refactor. The current relative risk plan works around it by explicitly adding `Player.player_relative_risk` to the direct query (Phase 3.7).

**Suggested fix:** Create a `mv_my_players` materialized view joining `Player`, `Team`, `GraphData`, and `Nation` with the same shape as the existing integration response. Update `get_favourite_players` to query the view. Apply the same refresh pattern used by other views.

---

## FE-4 — Frontend `FavouritePlayer` type drift after Phase 0 of the index plan

**File:** frontend `FavouritePlayer` TypeScript type (consumer of `GET /my-players/{user_id}`)

**Problem:** Phase 0 of `index_implementation_plan.md` extends the `/my-players/{user_id}` response to include `player_injury_risk` alongside the existing `player_injury_trend`. The backend `FavouritePlayer` TypedDict is updated in the same change, but the frontend's TypeScript type is not — strict consumers will either not see the new field or fail type-checking depending on how the type is declared.

**Why not fixed now:** The index-implementation plan is scoped to backend/DB. The frontend update is a separate touch in a different repo path and is best handled as a follow-up commit by whoever owns the My Players page.

**Suggested fix:** Update the frontend `FavouritePlayer` type to include `player_injury_risk: number` (mirror the backend TypedDict shape), and surface the new field in the My Players UI consistent with how `/dashboard/high-risk-players` already renders the same value.
