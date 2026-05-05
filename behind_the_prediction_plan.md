# Behind the Prediction Plan
**Goal:** Expose the three ML-generated player risk factors via a new API endpoint and display them on the player page.
**Decision:** New dedicated endpoint `GET /players/{player_id}/risk-factors` rather than extending the existing `/card` endpoint, keeping concerns separate and consistent with the existing router pattern.
**Status legend:** ✅ done · 🟡 in progress · ❌ not started

## Overview

| Phase | Summary |
|-------|---------|
| 0 | Blockers / pre-flight |
| 1 | DB query in `integration/player_page.py` |
| 2 | API endpoint in `routers/player_page.py` |
| 3 | Frontend UI component on the player page |
| 4 | Wire frontend to the live endpoint |

---

## Phase 0 — Blockers

No blockers. The three columns `player_risk_factor_1/2/3` already exist on the `player` table (see `server/database_init.py:135-137`) and are populated by `server/ingest_predictions.py`. The `Player` SQLModel is importable in the integration layer.

---

## Phase 1 — DB query

**Files affected**

| File | Change | Done |
|------|--------|------|
| `server/integration/player_page.py` | Add `PlayerRiskFactors` TypedDict and `get_player_risk_factors()` function | ✅ |

- [x] 1.1 Define `PlayerRiskFactors` TypedDict with keys `player_risk_factor_1`, `player_risk_factor_2`, `player_risk_factor_3` (all `str | None`)
- [x] 1.2 Add `get_player_risk_factors(player_id: int, session: Session) -> PlayerRiskFactors | None` — query `Player` by `player_id`, return the three fields or `None` if not found

---

## Phase 2 — API endpoint

**Files affected**

| File | Change | Done |
|------|--------|------|
| `server/routers/player_page.py` | Add `GET /{player_id}/risk-factors` route | ✅ |

- [x] 2.1 Add route `@router.get("/{player_id}/risk-factors")` that calls `player_page.get_player_risk_factors(player_id, session)` and raises 404 if `None`

---

## Phase 3 — Frontend UI component

**Files affected**

| File | Change | Done |
|------|--------|------|
| `frontendUpdatedSoccer2/src/app/api/types.ts` | Add `ApiPlayerRiskFactors` interface | ✅ |
| `frontendUpdatedSoccer2/src/app/api/mappers.ts` | Add `mapPlayerRiskFactors()` mapper | ✅ |
| `frontendUpdatedSoccer2/src/app/pages/TeamPage.tsx` | Add a `RiskFactorsCard` section that renders the three factors | ✅ |

- [x] 3.1 Add `ApiPlayerRiskFactors` interface to `types.ts` with fields `player_risk_factor_1/2/3: string | null`
- [x] 3.2 Add `mapPlayerRiskFactors()` in `mappers.ts` that converts the API type to a `string[]` (filtering nulls/empty strings)
- [x] 3.3 Add a state variable `riskFactors: string[] | undefined` in `TeamPage.tsx`
- [x] 3.4 Render the risk factors list in a card below the existing player detail — reuse the existing `riskFactors` rendering block already in `TeamPage.tsx:678-690`

---

## Phase 4 — Wire frontend to live endpoint

**Files affected**

| File | Change | Done |
|------|--------|------|
| `frontendUpdatedSoccer2/src/app/api/players.ts` | Add `getRiskFactors(playerId)` to `playersApi` | ✅ |
| `frontendUpdatedSoccer2/src/app/hooks/useApi.ts` | Add `usePlayerRiskFactors` hook | ✅ |
| `frontendUpdatedSoccer2/src/app/pages/TeamPage.tsx` | Replace manual state with `usePlayerRiskFactors`, merge into `currentPlayer` | ✅ |

- [x] 4.1 Add `getRiskFactors(playerId: string)` to `playersApi` in `players.ts` — fetches `/players/{playerId}/risk-factors`, maps with `mapPlayerRiskFactors`
- [x] 4.2 Add `usePlayerRiskFactors` hook to `useApi.ts` following the same pattern as other player hooks
- [x] 4.3 Use `usePlayerRiskFactors` in `TeamPage.tsx`, merge `riskFactorsData.factors` into `currentPlayer.riskFactors`

---

## Open decisions & pre-launch requirements

| # | Item | Decision / rule needed | Resolved |
|---|------|------------------------|----------|
| 1 | What to show when all three risk factor fields are empty strings or null? | Hide the card entirely, or show a placeholder message? | ❌ |
| 2 | Should risk factors also appear in the `MyPlayersPage` player detail, or only in `TeamPage`? | Scope decision | ❌ |
