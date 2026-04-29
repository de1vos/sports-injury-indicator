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
