# Ingestion Update Plan — UPSERT Instead of DROP & Refill

**Goal:** Replace DELETE + INSERT with UPSERT for tables with API-provided IDs, so `user_favourite` foreign keys survive re-ingestion. All other tables (DB-generated IDs) are wiped and re-inserted as before.
**Decision:** `team`, `player`, and `match` UPSERT on their API-provided IDs. `nation` inserts only new rows (DO NOTHING on conflict). Everything else is DELETE all + re-INSERT.
**Status legend:** ✅ done · 🟡 in progress · ❌ not started

---

## Table strategy

| Table | ID source | Strategy | Reason |
|-------|-----------|----------|--------|
| `nation` | DB-generated (`always=True`) | INSERT ... ON CONFLICT (nation_name) DO NOTHING | Only add new nations; existing nations never change. `player.nation_id` references it so rows can't be deleted. |
| `team` | API (`always=False`) | UPSERT on `team_id` | API-provided ID. `player.team_id` references it — can't delete while player rows exist |
| `player` | API (`always=False`) | UPSERT on `player_id` | API-provided ID. `user_favourite.player_id` references it — must never be deleted |
| `match` | DB-generated (`always=True`), `match_fixture_id` from API | UPSERT on `match_fixture_id` | Stable API ID allows update-in-place; avoids stale match rows accumulating |
| `season_meta` | DB-generated (`always=True`) | DELETE all + re-INSERT | Nothing user-facing references it |
| `player_season` | DB-generated (`always=True`) | DELETE all + re-INSERT | Only referenced by `player_injury` which is also wiped |
| `player_injury` | DB-generated (`always=True`) | DELETE all + re-INSERT | No FK from any kept table |
| `graph_data` | DB-generated (`always=True`) | DELETE all + re-INSERT | No FK from any kept table |

---

## Overview

| Phase | Summary |
|-------|---------|
| 0 | Add `UNIQUE` constraints on `nation.nation_name` and `match.match_fixture_id`; apply via `seed_db.py` |
| 1 | UPSERT team, player, match; INSERT-only for nation; stale-row cleanup |
| 2 | DELETE all + re-INSERT for season_meta, player_season, player_injury, graph_data |
| 3 | Verify FK integrity and ingest correctness end-to-end |

---

## Execution order within ingest

1. Drop materialized views
2. DELETE all rows from: `graph_data` → `player_injury` → `player_season` → `season_meta` (FK order; match is now UPSERT so excluded)
3. Stale cleanup — DELETE from `user_favourite` WHERE player_id not in new data
4. Stale cleanup — DELETE from `player` WHERE player_id not in new data
5. Stale cleanup — DELETE from `team` WHERE team_id not in new data
6. Stale cleanup — DELETE from `match` WHERE match_fixture_id not in new data
7. INSERT `nation` ... ON CONFLICT (nation_name) DO NOTHING → get `nation_name → nation_id` mapping from RETURNING
8. UPSERT `team`
9. UPSERT `player` (uses nation_id and team_id from steps 7–8)
10. UPSERT `match` (uses team_ids from step 8)
11. INSERT `season_meta`, `player_season`, `player_injury`, `graph_data` (FK order)
12. Recreate materialized views

---

## Phase 0 — Schema: add unique constraints

**Blocker:** `ON CONFLICT` clauses require unique constraints on the conflict targets. `team_id` and `player_id` are already PKs. Two new constraints are needed.

**Files affected**

| File | Change | Done |
|------|--------|------|
| `server/database_init.py` | Add `UniqueConstraint("nation_name", name="uq_nation_name")` to `Nation`; add `UniqueConstraint("match_fixture_id", name="uq_match_fixture_id")` to `Match` | ❌ |
| `server/seed_db.py` | Run to drop and recreate schema — constraints applied automatically via `SQLModel.metadata.create_all()` | ❌ |

**Steps**

- [x] 0.1 Add `__table_args__: ClassVar[tuple] = (UniqueConstraint("nation_name", name="uq_nation_name"),)` to `Nation` — the class currently has no `__table_args__` so it must be added with the `ClassVar` typing
- [x] 0.2 Add `UniqueConstraint("match_fixture_id", name="uq_match_fixture_id")` to `Match.__table_args__` in `database_init.py`
- [ ] 0.3 Run `seed_db.py` to apply the new schema (requires Supabase access)

---

## Phase 1 — Nation insert-only, UPSERT team / player / match + stale cleanup

**Files affected**

| File | Change | Done |
|------|--------|------|
| `server/ingest_predictions.py` | Replace DELETE + INSERT for nation, team, player, match with correct strategy; add stale-row cleanup | ❌ |

**Strategy per table**

| Table | Conflict target | On conflict |
|-------|----------------|-------------|
| `nation` | `nation_name` | DO NOTHING — only ever add new nations |
| `team` | `team_id` (PK) | UPDATE `team_name`, `team_logo`, `team_color` |
| `player` | `player_id` (PK) | UPDATE all non-key columns |
| `match` | `match_fixture_id` | UPDATE all non-key columns |

**Steps**

- [x] 1.1 Replace `DELETE FROM nation` + INSERT with `insert(Nation).on_conflict_do_nothing()` for new rows; follow with `SELECT nation_id, nation_name FROM nation WHERE nation_name IN (...)` to build the complete `nation_name_to_id` map — RETURNING alone is insufficient because `ON CONFLICT DO NOTHING` does not return existing rows
- [x] 1.2 Replace `DELETE FROM team` + INSERT with `insert(Team).on_conflict_do_update(index_elements=["team_id"], set_={...})`
- [x] 1.3 Replace `DELETE FROM player` + INSERT with `insert(Player).on_conflict_do_update(index_elements=["player_id"], set_={...})`
- [x] 1.4 Replace `DELETE FROM match` + INSERT with `insert(Match).on_conflict_do_update(index_elements=["match_fixture_id"], set_={...})`
- [x] 1.5 Add stale cleanup (steps 3–6 of execution order):
  - `DELETE FROM user_favourite WHERE player_id NOT IN (<new_player_ids>)`
  - `DELETE FROM player WHERE player_id NOT IN (<new_player_ids>)`
  - `DELETE FROM team WHERE team_id NOT IN (<new_team_ids>)`
  - `DELETE FROM match WHERE match_fixture_id NOT IN (<new_fixture_ids>)`
- [x] 1.6 Remove nation, team, player, match from the existing DELETE clearing loop

---

## Phase 2 — DELETE all + re-INSERT for remaining tables

These tables already work correctly with DELETE + INSERT. The only change needed is removing `match` from the clearing loop (now handled in Phase 1) and confirming execution order.

**Files affected**

| File | Change | Done |
|------|--------|------|
| `server/ingest_predictions.py` | Remove `match` from the DELETE clearing loop; confirm ordering | ❌ |

**Steps**

- [x] 2.1 DELETE order: `graph_data` → `player_injury` → `player_season` → `season_meta`
- [x] 2.2 Ensure this DELETE block runs before the UPSERT block (Phase 1)
- [x] 2.3 INSERT order after UPSERT tables are populated: `season_meta` → `player_season` → `player_injury` → `graph_data`
- [x] 2.4 Review `SET CONSTRAINTS ALL DEFERRED` (line 114 in current code) — with explicit FK ordering in the new flow this may no longer be needed; verify and remove if safe

---

## Phase 3 — Verification

**Steps**

- [ ] 3.1 Seed `user_favourite` rows before ingest; confirm they survive a full ingest cycle
- [ ] 3.2 Run ingest twice; confirm row counts are stable (not doubling for UPSERT tables)
- [ ] 3.3 Confirm `player_id` and `team_id` values in DB match source data after ingest
- [ ] 3.4 Confirm materialized views rebuild without error
- [ ] 3.5 Confirm `/my-players` endpoint returns saved players after ingest

---

## Open decisions

| # | Item | Decision | Resolved |
|---|------|----------|----------|
| 1 | `player_injury` upsert vs DELETE+INSERT | DELETE all + re-INSERT. No FK from `user_favourite` references it, and `player_season_id` is DB-generated so a stable composite key isn't needed. | ✅ |
| 2 | Migration strategy | No migration tooling. All schema changes go in `database_init.py` and are applied by running `seed_db.py` (DROP SCHEMA CASCADE + `create_all`). | ✅ |
| 3 | Stale player cleanup — cascade behaviour | No FK cascades exist. Stale cleanup deletes from `user_favourite` first, then `player`. A player removed from the API should also be removed from all user favourites. | ✅ |
