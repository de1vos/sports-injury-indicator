# Search Function Plan
**Goal:** Replace the current N+2 API call search with three dedicated endpoints, wire the data into the dropdown and ReportedInjuriesPage, then accelerate prefix matching with a trie.
**Decision:** All search filtering stays client-side — the three `/search/*` endpoints load once on first focus and are cached at module level. A trie replaces the sorted-array index in Phase 3 for O(m) prefix lookup instead of O(log n + k).
**Status legend:** ✅ done · 🟡 in progress · ❌ not started

## Overview

| Phase | Summary |
|---|---|
| 0 | Fix `mv_search_players` missing `team_id` — blocker for player click navigation |
| 1 | Add `api/search.ts`, update `useSearchData.ts` to fetch from the three search endpoints and store results locally |
| 2 | Wire the cached data into Navigation dropdown (default suggestions + query results) and ReportedInjuriesPage region filter |
| 3 | Replace `SortedIndex` with a trie for O(m) prefix search on players and teams |

---

## Phase 0 — Blockers

Three backend fixes are required before Phase 1 can proceed.

**Blocker A — `mv_search_players` missing `team_id`**
The view joins `team t` to get `team_name` but never SELECTs `t.team_id`. The frontend needs it to navigate to `/team/{team_id}?player={player_id}` on player click. Since `CREATE MATERIALIZED VIEW` is not idempotent, the view must be dropped and recreated after changing the definition.

**Blocker B — `mv_teams_overview` has no pre-scaled `avg_risk_pct`; `get_search_teams()` returns none of it**
The view stores `average_risk_of_injury` as a raw 0–1 decimal. The search endpoint should return a pre-scaled 0–100 integer percentage. Rather than scaling in the mapper (which every other endpoint already does individually), add a new `avg_risk_pct` column directly to `mv_teams_overview` as `ROUND(AVG(p.player_injury_risk) * 100)::int`. The endpoint also needs `amount_of_players` for the Navigation subtitle. Both are additive — existing endpoints using `average_risk_of_injury` are unaffected. Changing `mv_teams_overview` requires dropping all four dependent views (`mv_player_overview`, `mv_search_players`, `mv_team_player_list`, `mv_reported_injuries`) and recreating them in order.

**Blocker C — `mv_search_players` exposes `player_injury_risk` (0–1 decimal) instead of `player_relative_risk` (multiplier)**
The view and endpoint currently return `player_injury_risk` scaled to 0–100. Replace it with `player_relative_risk` — a `Decimal(6, 3)` multiplier (e.g. `1.8`) stored directly on the `player` table. No ×100 scaling in the mapper; return as a raw `float`. The `player_is_injured` flag (Blocker C original, now folded here) is still needed separately via a LEFT JOIN against active injuries using the same subquery pattern as `mv_teams_overview`.

**Files affected**

| File | Change | Done |
|---|---|---|
| `server/create_views.py` | `mv_teams_overview`: add `avg_risk_pct` column; `mv_search_players`: replace `player_injury_risk` with `player_relative_risk`, add `team_id`, add `player_is_injured` | ❌ |
| `server/integration/search.py` | `SearchPlayer`: replace `player_injury_risk: int` with `player_relative_risk: float \| None`, add `team_id: int`, `player_is_injured: bool`; `SearchTeam`: add `avg_risk_pct: int`, `squad_size: int` | ❌ |

- [ ] 0.1 In `create_views.py` `_create_mv_teams_overview()`: add `ROUND(ps.average_risk_of_injury * 100)::int AS avg_risk_pct` to the SELECT (additive — does not replace `average_risk_of_injury`)
- [ ] 0.2 In `create_views.py` `_create_mv_search_players()`: replace `p.player_injury_risk` with `p.player_relative_risk`; add `t.team_id`; add `CASE WHEN active_inj.player_id IS NOT NULL THEN TRUE ELSE FALSE END AS player_is_injured` via LEFT JOIN against active injuries (same subquery pattern as the `inj` block in `mv_teams_overview`)
- [ ] 0.3 In `integration/search.py` `SearchPlayer` TypedDict: replace `player_injury_risk: int` with `player_relative_risk: float | None`; add `team_id: int` and `player_is_injured: bool`; update mapper — `float(row["player_relative_risk"]) if row["player_relative_risk"] is not None else None` (no ×100)
- [ ] 0.4 In `integration/search.py` `get_search_teams()`: extend SELECT to include `avg_risk_pct, amount_of_players`; add `avg_risk_pct: int` and `squad_size: int` to `SearchTeam` TypedDict and mapper
- [ ] 0.5 Run migration: `DROP MATERIALIZED VIEW IF EXISTS mv_teams_overview CASCADE` (cascades to `mv_player_overview`, `mv_search_players`, `mv_team_player_list`, `mv_reported_injuries`); then recreate all views by re-running `create_all_views()`

---

## Phase 1 — Fetch & store from search endpoints

**Files affected**

| File | Change | Done |
|---|---|---|
| `frontendUpdatedSoccer2/src/app/api/search.ts` | New file — typed API calls for `/search/players`, `/search/teams`, `/search/injury-regions` | ❌ |
| `frontendUpdatedSoccer2/src/app/hooks/useSearchData.ts` | Replace N+2 fetch logic with 3 parallel search endpoint calls; update `SearchPlayer`/`SearchTeam` types to match backend response | ❌ |

- [ ] 1.1 Create `api/search.ts` with `searchApi.getPlayers()`, `searchApi.getTeams()`, `searchApi.getInjuryRegions()` — typed to match backend `SearchPlayer` / `SearchTeam` shapes
- [ ] 1.2 Update interfaces and field mappings in `useSearchData.ts` — map all snake_case backend fields to camelCase in the hook's load function:
  - `player_id (int) → id (string)` via `.toString()`
  - `team_id (int) → teamId (string)` via `.toString()`
  - `player_first_name → firstName`
  - `player_last_name → lastName`
  - `player_photo → photo`
  - `team_name → teamName` (on `SearchPlayer` — used as subtitle in Navigation)
  - `player_relative_risk → relativeRisk` (raw float, no scaling)
  - `player_is_injured → isInjured`
  - `team_name → name` (on `SearchTeam` — used as display text in Navigation)
  - `avg_risk_pct → avgRisk`
  - `amount_of_players → squadSize`
  Remove dependency on `teamsApi`, `playersApi`, `reportedInjuriesApi`
- [ ] 1.3 Replace the `load()` callback body with `Promise.all([searchApi.getPlayers(), searchApi.getTeams(), searchApi.getInjuryRegions()])` — 3 calls instead of N+2
- [ ] 1.4 Verify module-level cache still works correctly after refactor (loaded flag, setData on re-mount)

---

## Phase 2 — Wire data into UI

**Files affected**

| File | Change | Done |
|---|---|---|
| `frontendUpdatedSoccer2/src/app/components/Navigation.tsx` | Update default suggestions and query search to use Phase 1 data; ensure player click navigates with correct id | ❌ |
| `frontendUpdatedSoccer2/src/app/pages/ReportedInjuriesPage.tsx` | Source region filter options from `searchApi.getInjuryRegions()` instead of deriving from injury rows | ❌ |

- [ ] 2.1 In `Navigation.tsx`, update default suggestions sort to use `relativeRisk` (not `injuryRisk`) for players and `avgRisk` for teams
- [ ] 2.2 Confirm player result click routes to `/team/${player.teamId}?player=${player.id}` using the mapped camelCase IDs
- [ ] 2.3 Confirm team result click routes to `/team/${team.id}` using the mapped camelCase ID
- [ ] 2.4 In `Navigation.tsx`, update player badge: replace `{result.risk}%` with `{result.risk.toFixed(1)}×` and replace `getRiskColor` with multiplier thresholds from the Relative Risk Multiplier Plan — `< 1.5` → green (`#059669`), `1.5–2.0` → yellow (`#D97706`), `> 2.0` → red (`#DC2626`); reuse `getRelativeRiskMeta` helper if already created in Phase 4.2 of that plan, otherwise inline the thresholds here; when assigning to `SearchResult` use `risk: p.relativeRisk ?? undefined` — `SearchResult.risk` is typed `number | undefined` so passing `number | null` directly is a TypeScript compile error; guard the badge render with `result.risk != null` (double-equals) not `!== undefined` — `relativeRisk` is `null` for injured players and `null !== undefined` is true which would cause `.toFixed(1)` to crash
- [ ] 2.5 In `ReportedInjuriesPage.tsx`, call `searchApi.getInjuryRegions()` to populate the region dropdown instead of extracting from loaded injury rows
- [ ] 2.6 In `ReportedInjuriesPage.tsx`, add a `useEffect` watching `searchParams` to sync `filterRegion` and `filterOngoing` state when the URL changes while the page is already mounted — currently `useState` lazy initializers only run on mount so navigating from the search dropdown to the same page with a new `?region=` param has no effect; add `useEffect` import

---

## Phase 3 — Trie for O(m) prefix search

**Files affected**

| File | Change | Done |
|---|---|---|
| `frontendUpdatedSoccer2/src/app/hooks/useSearchData.ts` | Replace `SortedIndex<T>` class with a `Trie<T>` class; update `buildIndex()` and `SearchIndex` type | ❌ |

- [ ] 3.1 Implement `Trie<T>` class inside `useSearchData.ts`:
  - `insert(key: string, item: T)` — lowercase the key before walking/creating nodes character by character; store item at terminal node
  - `searchPrefix(prefix: string, limit: number): T[]` — lowercase the prefix before walking to the prefix node, then DFS/BFS to collect up to `limit` items
  - `searchContains(query: string, limit: number): T[]` — lowercase the query; linear scan of all terminal nodes (trie doesn't help mid-string)
- [ ] 3.2 Replace `SortedIndex` usages in `buildIndex()` with `Trie`: `playersByFullName`, `playersByLastFirst`, `teamsByName`; also update the `SearchIndex` interface to declare fields as `Trie<SearchPlayer>` and `Trie<SearchTeam>` — without this TypeScript errors on the interface after `SortedIndex` is deleted
- [ ] 3.3 Remove the `SortedIndex` class
- [ ] 3.4 Verify `searchPlayers()` and `searchTeams()` exported functions still work correctly with trie (prefix path, fallback to contains)

---

## TL;DR checklist

**Phase 0**
- [ ] 0.1 Add `avg_risk_pct` column to `mv_teams_overview`
- [ ] 0.2 Update `mv_search_players`: swap `player_injury_risk` → `player_relative_risk`, add `team_id` + `player_is_injured`
- [ ] 0.3 Update `SearchPlayer` TypedDict + mapper in `integration/search.py`
- [ ] 0.4 Update `SearchTeam` TypedDict + `get_search_teams()` to return `avg_risk_pct` + `squad_size`
- [ ] 0.5 Drop `mv_teams_overview CASCADE` and recreate all views

**Phase 1**
- [ ] 1.1 Create `api/search.ts` with typed calls to all three endpoints
- [ ] 1.2 Map all snake_case backend fields to camelCase in hook; int IDs → strings
- [ ] 1.3 Replace N+2 fetch with 3 parallel calls in `useSearchData.ts`
- [ ] 1.4 Verify cache behaviour unchanged

**Phase 2**
- [ ] 2.1 Default suggestions sort by `relativeRisk` (players) and `avgRisk` (teams)
- [ ] 2.2 Player click routes using camelCase `id` / `teamId`
- [ ] 2.3 Team click routes using camelCase `id`
- [ ] 2.4 Player badge shows `{risk}×` with multiplier color thresholds (< 1.5 green, 1.5–2.0 yellow, > 2.0 red); null-guarded with `!= null`
- [ ] 2.5 ReportedInjuriesPage region filter sourced from endpoint
- [ ] 2.6 ReportedInjuriesPage syncs `filterRegion`/`filterOngoing` from `searchParams` on URL change

**Phase 3**
- [ ] 3.1 Implement `Trie<T>` with `insert` (lowercase key), `searchPrefix` (lowercase prefix), `searchContains` (lowercase query)
- [ ] 3.2 Swap `SortedIndex` for `Trie` in `buildIndex()`
- [ ] 3.3 Delete `SortedIndex` class
- [ ] 3.4 Verify `searchPlayers` / `searchTeams` correct with trie
