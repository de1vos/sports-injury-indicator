# Relative Risk Multiplier Plan
**Goal:** Add a relative risk multiplier (player risk ÷ league average) to the data layer alongside the existing absolute injury risk. In the frontend, replace the displayed injury risk % with the multiplier on the Dashboard high-risk module (filter > 2.0×), My Players page, and team roster list; show it alongside injury risk on the Player card (colour-coded with label). The underlying `player_injury_risk` field is never removed from DB, API, or response schemas.
**Decision:** Compute league average inside `predict_players.py` after all player risks are scored, using only players with ≥ 90 minutes in the last 30 days and risk < 0.99 (not currently injured). Store the multiplier as `player_relative_risk` on the Player table.
**Status legend:** ✅ done · 🟡 in progress · ❌ not started

---

## Overview

| Phase | Summary |
|-------|---------|
| 0 | Blockers & pre-flight checks |
| 1 | Compute `relative_risk` in ML pipeline and add to `predictions.json` output |
| 2 | DB schema migration + ingest update |
| 3 | Add `player_relative_risk` to views and API responses; add high-risk filter on relative risk |
| 4 | Frontend — Dashboard, My Players, Player card, team roster list |

---

## Phase 0 — Blockers & pre-flight

- [x] 0.1 **Field name is `minutes_last_30d`** (not `minutes_last_30`), nested inside the `workload` dict at `record["workload"]["minutes_last_30d"]` (`predict_players.py:610`). Phase 1 step 1.2 must use this path.
- [x] 0.2 **Safe.** Full `records` list is built and sorted at line 656, then placed into the output dict at line 670. Relative risk calculation can be inserted between those two lines.
- [x] 0.3 **Additive, not breaking.** Frontend converts `player_injury_risk` to an integer 0–100 percentage (`dashboard.ts:74`, `PlayerCard.tsx:136`, `MyPlayersPage.tsx:120`). Since `player_relative_risk` is a new field alongside the existing one, nothing breaks — but Phase 4 **must** add the new field to `api/types.ts` and `api/mappers.ts` before using it in components.
- [x] 0.4 **Confirmed blocker resolved in Phase 2.** `player_injury_risk` is `Numeric(4,3)` with `CheckConstraint('... BETWEEN 0 AND 1')` (`database_init.py:121`). The new `player_relative_risk` column must use `Numeric(6,3)` with **no** BETWEEN constraint, as the multiplier can exceed 1.
- [x] 0.5 **Safe.** The `< 0.99` sentinel filters in `create_views.py` (lines 72, 141) apply only to `player_injury_risk`. For the new high-risk view, injured players will have `player_relative_risk IS NULL`, so `> 2.0` naturally excludes them — no sentinel needed.
- [x] 0.6 **Bug: `safe_int` returns `None` for NaN — handled in Phase 1.** `predict_players.py:100–105` — `safe_int` returns `None` when the value is NaN. Fix is captured in Phase 1 step 1.2: use `(r["workload"]["minutes_last_30d"] or 0) >= 90`.
- [x] 0.7 **`clamp_risk()` must not be used for relative risk — no upper bound.** `ingest_predictions.py:51–56` — `clamp_risk` enforces `[0, 0.999]`, for absolute risk only. `player_relative_risk` has no upper limit (a player can be 5×, 10×, etc. the league average). Phase 2 must store the raw value directly — no clamping, no cap.
- [x] 0.8 **`mv_high_risk_players` filter and ORDER BY must both use `player_relative_risk`.** WHERE filter changes to `player_relative_risk > 2.0` and ORDER BY changes from `player_injury_risk DESC` to `player_relative_risk DESC` (`create_views.py:73`). Captured in Phase 3 step 3.4.
- [x] 0.9 **`server/integration/my_players.py` uses a direct SQLAlchemy column select, not a view — deferred.** New columns are not picked up automatically. Logged as FE-5 in `server/backend_plans/future_errors.md` for a future `mv_my_players` view migration. For now, Phase 3.7 explicitly adds `Player.player_relative_risk` to the direct query as a workaround.
- [x] 0.10 **`dashboard.ts` has its own `DashboardHighRiskPlayer` interface (`dashboard.ts:23`) separate from `types.ts`.** Phase 4 step 4.1 covers both files explicitly.

---

## Phase 1 — ML: compute relative risk and output to predictions.json

**Files affected:**

| File | Change | Done |
|------|--------|------|
| `ml/predict_players.py` | After all player risk scores are computed, calculate league average and add `relative_risk` per player | ❌ |
| `ml/config.py` | Add `MIN_MINUTES_LAST_30` constant (value: 90) | ❌ |

- [ ] 1.1 Add `MIN_MINUTES_LAST_30 = 90` to `ml/config.py`
- [ ] 1.2 In `predict_players.py`, insert after the `records.sort(...)` call (line 656): build the eligible pool as players where `r["workload"]["minutes_last_30d"] >= 90` AND `r["injury_risk"] < 0.99`
- [ ] 1.3 Compute `league_average_risk = mean(injury_risk for player in eligible_pool)` — add a guard for empty pool (log a warning and set all `relative_risk = None`)
- [ ] 1.4 For each player: if `injury_risk >= 0.99` (currently injured) set `relative_risk = None`; else set `relative_risk = round(injury_risk / league_average_risk, 3)`
- [ ] 1.5 Add `"relative_risk": float | null` to each player object in the JSON output (alongside existing `injury_risk`)
- [ ] 1.6 Log league average and pool size to stdout for observability
- [ ] 1.7 Run `python ml/predict_players.py` locally and confirm `output/predictions.json` contains `relative_risk` on player objects and values look sane (most near 1.0, high-risk players > 1, low-risk < 1)

---

## Phase 2 — DB schema + ingest

**Files affected:**

| File | Change | Done |
|------|--------|------|
| `server/database_init.py` | Add `player_relative_risk: Optional[Decimal] = Field(default=None, ...)` column to `Player` model | ❌ |
| `server/ingest_predictions.py` | Read `relative_risk` from JSON and write to `player_relative_risk`; handle `None` | ❌ |

- [ ] 2.1 In `server/database_init.py`, add `player_relative_risk: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(6, 3)))` to the `Player` model (after `player_injury_risk`)
- [ ] 2.2 In `server/ingest_predictions.py` player ingest block (lines ~164–194), read `p.get("relative_risk")` and set `player_relative_risk` — keep existing `player_injury_risk` unchanged
- [ ] 2.3 Store `relative_risk` directly with no upper cap — do not use `clamp_risk()`; `player_relative_risk` is unbounded above
- [ ] 2.4 Drop and recreate the DB (or run a schema migration) — confirm `player_relative_risk` column exists in `player` table
- [ ] 2.5 Run `python server/ingest_predictions.py` against the updated `predictions.json` and confirm rows populate with non-null `player_relative_risk` for non-injured players

---

## Phase 3 — API endpoints and materialized views

**Files affected:**

| File | Change | Done |
|------|--------|------|
| `server/create_views.py` | Add `player_relative_risk` to all views that expose player risk data | ❌ |
| `server/integration/dashboard.py` | Expose `player_relative_risk` in high-risk and trending player responses | ❌ |
| `server/integration/player_page.py` (if exists) | Add `player_relative_risk` to player card, team roster, and related responses | ❌ |
| `server/routers/player_page.py` | Pass `player_relative_risk` through to response schema for both `GET /players/team/{team_id}` and `GET /players/{player_id}/card` | ❌ |
| `server/routers/dashboard.py` | Pass `player_relative_risk` through to response schema | ❌ |

- [ ] 3.1 In `server/create_views.py`, add `p.player_relative_risk` to `mv_high_risk_players`, `mv_trending_risk_players`, `mv_player_card`, `mv_teams_overview`, and any view backing `GET /players/team/{team_id}` SELECT lists
- [ ] 3.2 Drop and recreate all materialized views (`python server/create_views.py` or equivalent) — confirm `player_relative_risk` appears in view columns
- [ ] 3.3 Update integration query in `server/integration/dashboard.py` — add `player_relative_risk` to result mapping for `get_high_risk_players` and `get_trending_risk_players`
- [ ] 3.4 Add `player_relative_risk > 2.0` as the filter for the high-risk players module and change ORDER BY from `player_injury_risk DESC` to `player_relative_risk DESC` (`create_views.py:73`) — update both the MV and the integration query. Keep `player_injury_risk` in the response.
- [ ] 3.5 Update player card integration to include `player_relative_risk` in the returned dict
- [ ] 3.6 Update team roster integration (`GET /players/team/{team_id}`) to include `player_relative_risk` per player in the response
- [ ] 3.7 Update My Players integration (`server/integration/my_players.py:67`) — this uses a direct SQLAlchemy column select, not a view; explicitly add `Player.player_relative_risk` to the query and to the `FavouritePlayer` TypedDict
- [ ] 3.8 Update Pydantic response schemas (if typed) to add `player_relative_risk: Optional[float]`
- [ ] 3.9 Smoke-test `GET /dashboard/high-risk-players` — confirm only players with relative risk > 2.0 are returned; smoke-test `GET /players/team/{team_id}`, `GET /players/{id}/card`, and My Players endpoint

---

## Phase 4 — Frontend

**Colour coding and labels for relative risk (used across all surfaces):**

| Range | Colour | Label |
|-------|--------|-------|
| < 1.5× | Green | Durable |
| 1.5×–2.0× | Yellow | Monitor |
| > 2.0× | Red | Critical |

**Files affected:**

| File | Change | Done |
|------|--------|------|
| Dashboard high-risk module component | Replace injury risk % with `{relativeRisk}×`; only players > 2.0× shown (enforced by API) | ❌ |
| My Players page component | Replace injury risk % with `{relativeRisk}×` | ❌ |
| Player card component | Add relative risk badge next to existing injury risk — multiplier value, colour-coded chip, label ('Durable' / 'Monitor' / 'Critical') | ❌ |
| Team roster list component (player page) | Replace injury risk % with `{relativeRisk}×` | ❌ |
| Shared utility (e.g. `utils/risk.ts`) | Add `getRelativeRiskMeta(value)` helper returning `{ color, label }` | ❌ |

- [ ] 4.1 Add `player_relative_risk?: number | null` to `ApiHighRiskPlayer`, `ApiPlayerCard`, and `ApiTeamPlayer` in `api/types.ts`; add `relativeRisk?: number` to `DashboardHighRiskPlayer` in `api/dashboard.ts:23`; map through in `api/mappers.ts` and `api/dashboard.ts:74` — do not remove or rename `injuryRisk`
- [ ] 4.2 Create `getRelativeRiskMeta(value: number | null): { color: string; label: string }` helper in a shared utils file — implements the three-tier colour/label mapping above; returns a neutral state for `null`
- [ ] 4.3 Dashboard high-risk module: replace the injury risk % text with `{relativeRisk.toFixed(1)}×`
- [ ] 4.4 My Players page: replace the injury risk % text with `{relativeRisk.toFixed(1)}×`
- [ ] 4.5 Player card: add a new badge/chip element alongside the existing injury risk display showing the multiplier value, chip colour from `getRelativeRiskMeta`, and label
- [ ] 4.6 Team roster list (player page): replace the injury risk % cell with `{relativeRisk.toFixed(1)}×`, colour the value using `getRelativeRiskMeta`
- [ ] 4.7 Handle `null` relative risk (currently injured players) gracefully on all four surfaces — show '—' rather than crashing or showing 0×
- [ ] 4.8 Verify in browser: Dashboard shows only > 2.0× players with multiplier; My Players and team roster show multiplier; Player card shows multiplier badge alongside injury risk %

---

## TL;DR checklist

**Phase 0 — Blockers** ✅ all resolved
- [x] 0.1 Field is `workload["minutes_last_30d"]` — Phase 1 uses correct path
- [x] 0.2 Full list assembled before JSON write — safe insertion point at line 656
- [x] 0.3 Frontend converts `player_injury_risk` to %; new field is additive — Phase 4 adds types/mappers
- [x] 0.4 New column must be `Numeric(6,3)` with no BETWEEN constraint
- [x] 0.5 `< 0.99` sentinel on `player_injury_risk` only; NULL relative risk naturally excludes injured players
- [x] 0.6 `safe_int` returns `None` for NaN — Phase 1 pool filter must use `(... or 0) >= 90`
- [x] 0.7 `clamp_risk()` caps at 0.999 — must NOT be used for relative risk; store raw value with no cap
- [x] 0.8 `mv_high_risk_players` ORDER BY is `player_injury_risk DESC` — Phase 3 must change to `player_relative_risk DESC`
- [x] 0.9 My Players direct SQLAlchemy select — deferred to FE-5 in future_errors.md; Phase 3.7 adds field as workaround
- [x] 0.10 `dashboard.ts:23` has its own `DashboardHighRiskPlayer` interface separate from `types.ts` — Phase 4 must update it too

**Phase 1 — ML**
- [ ] 1.1 Add `MIN_MINUTES_LAST_30 = 90` to config
- [ ] 1.2 Build eligible pool (≥90 min last 30d, not currently injured)
- [ ] 1.3 Compute league average with empty-pool guard
- [ ] 1.4 Set `relative_risk` per player (None if injured)
- [ ] 1.5 Add `relative_risk` field to JSON output
- [ ] 1.6 Log league average and pool size
- [ ] 1.7 Verify `predictions.json` output looks correct

**Phase 2 — DB + ingest**
- [ ] 2.1 Add `player_relative_risk` column to `Player` model
- [ ] 2.2 Read and store `relative_risk` from JSON in ingest script
- [ ] 2.3 Store raw value — no cap, do not use `clamp_risk()`
- [ ] 2.4 Apply schema change to DB
- [ ] 2.5 Run ingest and verify DB rows

**Phase 3 — API**
- [ ] 3.1 Add `player_relative_risk` to all affected materialized views
- [ ] 3.2 Recreate views and confirm column present
- [ ] 3.3 Update dashboard integration layer
- [ ] 3.4 Add `player_relative_risk > 2.0` as high-risk filter; keep existing `player_injury_risk` in response
- [ ] 3.5 Update player card integration layer
- [ ] 3.6 Update team roster integration (`GET /players/team/{team_id}`)
- [ ] 3.7 Update My Players integration layer
- [ ] 3.8 Update Pydantic response schemas
- [ ] 3.9 Smoke-test API responses

**Phase 4 — Frontend**
- [ ] 4.1 Add `player_relative_risk` to `api/types.ts` and `api/mappers.ts`
- [ ] 4.2 Create `getRelativeRiskMeta` helper (colour + label)
- [ ] 4.3 Dashboard high-risk module: replace % with multiplier
- [ ] 4.4 My Players page: replace % with multiplier
- [ ] 4.5 Player card: add colour-coded badge with label alongside existing %
- [ ] 4.6 Team roster list: replace % with multiplier, colour-coded
- [ ] 4.7 Handle `null` (injured) on all four surfaces — show '—'
- [ ] 4.8 Verify in browser across all four surfaces

---

## Branch plan

| Branch | Base | Purpose |
|--------|------|---------|
| `RelativeRiskMultiplier` | `main` | All work for this feature — ML, DB, API, frontend |

All phases ship on the single `RelativeRiskMultiplier` branch (already created). Merge to `main` only after Phase 4 is verified end-to-end. No intermediate merges — each phase builds directly on the previous.
