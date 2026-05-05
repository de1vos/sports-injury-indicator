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

`mv_search_players` joins `team t` to get `team_name` but does not SELECT `t.team_id`. The frontend needs `team_id` to route to `/team/{team_id}?player={player_id}` when a player result is clicked. The view must be dropped and recreated (not idempotent), and the backend mapper updated.

**Files affected**

| File | Change | Done |
|---|---|---|
| `server/create_views.py` | Add `t.team_id` to SELECT in `_create_mv_search_players()` | ❌ |
| `server/integration/search.py` | Add `team_id` to `SearchPlayer` TypedDict and to the mapper dict in `get_search_players()` | ❌ |

- [ ] 0.1 In `create_views.py` line 165, add `t.team_id,` to the SELECT list in `_create_mv_search_players()`
- [ ] 0.2 In `integration/search.py`, add `team_id: int` to the `SearchPlayer` TypedDict and `"team_id": row["team_id"]` to the mapper
- [ ] 0.3 Run migration on the database: `DROP MATERIALIZED VIEW IF EXISTS mv_search_players CASCADE;` then re-run view creation (or re-run the full setup script if available)

---

## Phase 1 — Fetch & store from search endpoints

**Files affected**

| File | Change | Done |
|---|---|---|
| `frontendUpdatedSoccer2/src/app/api/search.ts` | New file — typed API calls for `/search/players`, `/search/teams`, `/search/injury-regions` | ❌ |
| `frontendUpdatedSoccer2/src/app/hooks/useSearchData.ts` | Replace N+2 fetch logic with 3 parallel search endpoint calls; update `SearchPlayer`/`SearchTeam` types to match backend response | ❌ |

- [ ] 1.1 Create `api/search.ts` with `searchApi.getPlayers()`, `searchApi.getTeams()`, `searchApi.getInjuryRegions()` — typed to match backend `SearchPlayer` / `SearchTeam` shapes
- [ ] 1.2 Update `SearchPlayer` interface in `useSearchData.ts` to include `player_photo` and use backend field names (or map them); remove dependency on `teamsApi`, `playersApi`, `reportedInjuriesApi`
- [ ] 1.3 Replace the `load()` callback body with `Promise.all([searchApi.getPlayers(), searchApi.getTeams(), searchApi.getInjuryRegions()])` — 3 calls instead of N+2
- [ ] 1.4 Verify module-level cache still works correctly after refactor (loaded flag, setData on re-mount)

---

## Phase 2 — Wire data into UI

**Files affected**

| File | Change | Done |
|---|---|---|
| `frontendUpdatedSoccer2/src/app/components/Navigation.tsx` | Update default suggestions and query search to use Phase 1 data; ensure player click navigates with correct id | ❌ |
| `frontendUpdatedSoccer2/src/app/pages/ReportedInjuriesPage.tsx` | Source region filter options from `searchApi.getInjuryRegions()` (or from the cached hook) instead of deriving from injury rows | ❌ |

- [ ] 2.1 In `Navigation.tsx`, confirm default suggestions (top teams by risk, top players by risk) still work with the new `SearchTeam`/`SearchPlayer` shapes
- [ ] 2.2 Confirm player result click routes to `/team/${player.team_id}?player=${player.player_id}` using the backend-provided IDs
- [ ] 2.3 Confirm team result click routes to `/team/${team.team_id}` using the backend-provided ID
- [ ] 2.4 In `ReportedInjuriesPage.tsx`, call `searchApi.getInjuryRegions()` (or read from the cache) to populate the region dropdown instead of extracting from loaded injury rows

---

## Phase 3 — Trie for O(m) prefix search

**Files affected**

| File | Change | Done |
|---|---|---|
| `frontendUpdatedSoccer2/src/app/hooks/useSearchData.ts` | Replace `SortedIndex<T>` class with a `Trie<T>` class; update `buildIndex()` and `SearchIndex` type | ❌ |

- [ ] 3.1 Implement `Trie<T>` class inside `useSearchData.ts`:
  - `insert(key: string, item: T)` — walk/create nodes character by character, store item at terminal node
  - `searchPrefix(prefix: string, limit: number): T[]` — walk to prefix node, then DFS/BFS to collect up to `limit` items
  - `searchContains(query: string, limit: number): T[]` — linear fallback (same as before, trie doesn't help mid-string)
- [ ] 3.2 Replace `SortedIndex` usages in `buildIndex()` with `Trie`: `playersByFullName`, `playersByLastFirst`, `teamsByName`
- [ ] 3.3 Remove the `SortedIndex` class
- [ ] 3.4 Verify `searchPlayers()` and `searchTeams()` exported functions still work correctly with trie (prefix path, fallback to contains)

---

## TL;DR checklist

**Phase 0**
- [ ] 0.1 Add `t.team_id` to SELECT in `_create_mv_search_players()`
- [ ] 0.2 Add `team_id` to `SearchPlayer` TypedDict and mapper
- [ ] 0.3 Drop and recreate `mv_search_players` in the database

**Phase 1**
- [ ] 1.1 Create `api/search.ts` with typed calls to all three endpoints
- [ ] 1.2 Update `SearchPlayer`/`SearchTeam` interfaces to match backend
- [ ] 1.3 Replace N+2 fetch with 3 parallel calls in `useSearchData.ts`
- [ ] 1.4 Verify cache behaviour unchanged

**Phase 2**
- [ ] 2.1 Default suggestions work with new shapes
- [ ] 2.2 Player click uses backend `player_id` / `team_id`
- [ ] 2.3 Team click uses backend `team_id`
- [ ] 2.4 ReportedInjuriesPage region filter sourced from endpoint

**Phase 3**
- [ ] 3.1 Implement `Trie<T>` with `insert`, `searchPrefix`, `searchContains`
- [ ] 3.2 Swap `SortedIndex` for `Trie` in `buildIndex()`
- [ ] 3.3 Delete `SortedIndex` class
- [ ] 3.4 Verify `searchPlayers` / `searchTeams` correct with trie
