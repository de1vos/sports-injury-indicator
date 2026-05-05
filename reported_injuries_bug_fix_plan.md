# Reported Injuries Bug Fix Plan
**Goal:** Backend returns `player_id` and `team_id` in the reported injuries endpoint so the frontend can navigate to player/team pages.
**Decision:** Fix the materialized view and integration layer — frontend types already expect these fields.
**Status legend:** ✅ done · 🟡 in progress · ❌ not started

## Overview

| Phase | Summary |
|-------|---------|
| 1 | Add `player_id` and `team_id` to the backend view and serializer |
| 2 | Verify frontend uses the fields correctly and fix any gaps |

---

## Phase 0 — Blockers

No blockers.

---

## Phase 1 — Backend: expose `player_id` and `team_id`

**Files affected**

| File | Change | Done |
|------|--------|------|
| `server/create_views.py` | Add `p.player_id` and `p.team_id` to `mv_reported_injuries` SELECT | ✅ |
| `server/integration/reported_injuries.py` | Add `player_id` and `team_id` to `InjuryList` TypedDict and return dict | ✅ |

- [x] 1.1 In `create_views.py`, add `p.player_id` and `p.team_id` to the `mv_reported_injuries` SELECT clause (after the existing `p.player_photo` line)
- [ ] 1.2 Drop and recreate the materialized view (`DROP MATERIALIZED VIEW IF EXISTS mv_reported_injuries; CREATE MATERIALIZED VIEW ...`)
- [x] 1.3 In `integration/reported_injuries.py`, add `player_id: int` and `team_id: int` to the `InjuryList` TypedDict
- [x] 1.4 In `integration/reported_injuries.py`, add `"player_id": row["player_id"]` and `"team_id": row["team_id"]` to the returned dict

---

## Phase 2 — Frontend: verify correct usage

**Files affected**

| File | Change | Done |
|------|--------|------|
| `frontendUpdatedSoccer2/src/app/api/types.ts` | Verify `ApiReportedInjury` has `player_id: number` and `team_id: number` | ❌ |
| `frontendUpdatedSoccer2/src/app/api/reportedInjuries.ts` | Verify `mapReportedInjury` maps both fields correctly | ❌ |
| `frontendUpdatedSoccer2/src/app/pages/ReportedInjuriesPage.tsx` | Verify navigation link and team logo use `playerId` / `teamId` | ❌ |

- [ ] 2.1 Confirm `ApiReportedInjury` in `types.ts` declares `player_id: number` and `team_id: number` (already present — verify and keep)
- [ ] 2.2 Confirm `mapReportedInjury` in `reportedInjuries.ts` sets `playerId: String(i.player_id)` and `teamId: String(i.team_id)` (already present — verify)
- [ ] 2.3 Confirm `ReportedInjuriesPage.tsx` constructs the player link as `/team/${injury.teamId}?player=${injury.playerId}` (line ~296)
- [ ] 2.4 Confirm team logo `src` uses `injury.teamId` (line ~315)
- [ ] 2.5 Smoke-test: start dev server, open Reported Injuries page, click a player — confirm navigation lands on the correct team/player page

---

## TL;DR Checklist

**Phase 1 — Backend**
- [ ] 1.1 Add `p.player_id`, `p.team_id` to `mv_reported_injuries` SELECT in `create_views.py`
- [ ] 1.2 Recreate the materialized view in the database
- [ ] 1.3 Add fields to `InjuryList` TypedDict in `integration/reported_injuries.py`
- [ ] 1.4 Add fields to return dict in `integration/reported_injuries.py`

**Phase 2 — Frontend**
- [ ] 2.1 Verify `ApiReportedInjury` type in `types.ts`
- [ ] 2.2 Verify `mapReportedInjury` mapping in `reportedInjuries.ts`
- [ ] 2.3 Verify player link construction in `ReportedInjuriesPage.tsx`
- [ ] 2.4 Verify team logo src in `ReportedInjuriesPage.tsx`
- [ ] 2.5 Smoke-test in browser
