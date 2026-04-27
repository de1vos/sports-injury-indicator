# Database Population Plan — Phase 1

**Goal:** populate the PostgreSQL database (defined in `server/database_init.py`) from the current ML artifacts (`output/predictions.json`, `output/matches.json`) so that the FastAPI backend serves real data to `frontendUpdatedSoccer2`.

Phase 2 (daily refresh job) is out of scope here — but the ingestion script we build in Phase 1 must be re-runnable so Phase 2 only needs a scheduler.

---

## 1. The pipeline today (where the gap is)

```
API-Football ──► data/*.csv ──► ml/predict_players.py ──► output/predictions.json
                                                                   │
                                                                   ▼
                                                           ❌ NOT INGESTED
                                                                   │
                                                                   ▼
                  PostgreSQL (server/database_init.py) ──► FastAPI ──► frontend
```

The ML side produces a complete, well-shaped JSON file. The DB side has a matching schema. **Nothing connects them.** `server/seed_db.py` only loads `test_data.sql` (static fixtures). We need an ingestion script: `output/predictions.json` + `output/matches.json` → DB rows.

---

## 2. Field-level mapping: ML output → DB columns

Source records: each entry of `output/predictions.json` (per player) and `output/matches.json` (completed + upcoming).

### 2.1 `nation` table
| DB column | Source |
|---|---|
| `nation_name` | `predictions[].nationality` (deduped) |
| `nation_flag_image` | ⚠️ **MISSING from ML output** — see §4 |

### 2.2 `team` table
| DB column | Source |
|---|---|
| `team_id` | `predictions[].team_id` |
| `team_name` | `predictions[].team` |
| `team_logo` | `predictions[].team_logo` |
| `team_color` | ⚠️ **MISSING** — see §4 |

### 2.3 `player` table
| DB column | Source | Notes |
|---|---|---|
| `player_id` | `predictions[].player_id` | |
| `team_id` | `predictions[].team_id` | FK |
| `nation_id` | lookup by `nationality` | FK |
| `player_first_name` | `predictions[].firstname` | |
| `player_last_name` | `predictions[].lastname` | |
| `player_position` | `predictions[].position` | |
| `player_age` | `predictions[].age` | |
| `player_height` | `predictions[].height` | DB is `str`; ML gives int cm → format `"184 cm"` |
| `player_weight` | `predictions[].weight` | DB is `str`; format `"68 kg"` |
| `player_photo` | `predictions[].photo` | |
| `player_kit_number` | `predictions[].kit_number` | |
| `player_injury_risk` | `predictions[].injury_risk` | already 0.00–1.00 ✓ |
| `player_risk_factor_1/2/3` | `predictions[].risk_factor_1/2/3` | ⚠️ **schema is `VARCHAR(50)` but some ML strings exceed 50 chars** — see §4 |

### 2.4 `player_season` table
One row per season per player. Source: `predictions[].season_stats[]`.

| DB column | Source |
|---|---|
| `player_id` | parent record |
| `player_season_year` | `season_stats[].season` |
| `player_season_appearences` | `season_stats[].appearances` |
| `player_season_minutes` | `season_stats[].minutes` |
| `player_season_fouls_drawn` | `season_stats[].fouls_drawn` (nullable in ML — coalesce to 0) |
| `player_season_fouls_commited` | `season_stats[].fouls_committed` |
| `player_season_duels_total` | `season_stats[].duels_total` |
| `player_season_tackles` | `season_stats[].tackles` |
| `player_season_yellow_cards` | `season_stats[].yellow_cards` |
| `player_season_red_cards` | `season_stats[].red_cards` |
| `player_season_goals` | `season_stats[].goals` |
| `player_season_assists` | `season_stats[].assists` |
| `player_season_dribbles_attempts` | `season_stats[].dribbles_attempts` |
| `player_season_games_missed` | derived from `injury_summary.matches_missed_this_season` for current season — only correct for the current season; for past seasons ⚠️ **not in ML output** (see §4) |
| `player_season_rating` | `season_stats[].rating` |

### 2.5 `player_injury` table
One row per injury. Source: `predictions[].injury_history[]`.

| DB column | Source | Notes |
|---|---|---|
| `player_season_id` | derived: match injury `start` year to a `player_season.player_season_year` | requires lookup after seasons inserted |
| `player_injury_type` | `injury_history[].type` | |
| `player_injury_days_out` | `injury_history[].days_out` | |
| `player_injury_start` | `injury_history[].start` | |
| `player_injury_end` | `injury_history[].end` | nullable |
| `player_injury_severity` | `injury_history[].severity` | |
| `player_injury_region` | `injury_history[].body_region` | |

### 2.6 `graph_data` table
One row per player. Source: `predictions[].injury_risk_trend[]` (38 entries, gw_1…gw_38).

| DB column | Source | Notes |
|---|---|---|
| `player_id` | parent | |
| `gw_1` … `gw_38` | `injury_risk_trend[i].risk` mapped by `gw` label | "Injured" string → `0.99` sentinel (matches the `>= 0.99` check in `integration/player_page.py`) |
| `player_injury_trend` | ⚠️ **not produced by ML** — compute in ingestion script as `(latest_gw_risk - earliest_gw_risk) * 100` (see §4) |
| `graph_data_current_gw` | ⚠️ **not in ML output** — compute from today's date (see §4) |

### 2.7 `match` table
Source: `output/matches.json` (`completed[]` + `upcoming[]`).

| DB column | Source | Notes |
|---|---|---|
| `match_id` | auto / use `fixture_id` | |
| `match_fixture_id` | `fixture_id` | |
| `home_team_id` | lookup by `home_team.name` | ⚠️ **matches.json gives team name+logo only, no team_id** — see §4 |
| `away_team_id` | lookup by `away_team.name` | same |
| `match_date` | parse from `date` (ISO) | |
| `match_time` | parse from `date` (ISO) | |
| `match_game_week` | `round` → normalize to `"gw1"`…`"gw38"` | |
| `match_venue` | `venue` | |
| `match_goals_home` | `score.home` (completed only; null/0 for upcoming) | |
| `match_goals_away` | `score.away` | |
| `match_is_played` | `true` for `completed[]`, `false` for `upcoming[]` | |
| `home_avg_injury_risk` | **derived** — `AVG(player.player_injury_risk)` over home team after players inserted | DB field is `NUMERIC(2,2)` — needs widening, see §4 |
| `away_avg_injury_risk` | same | |

### 2.8 Tables not populated from ML output (out of scope here)
- `app_user`, `user_favourite` — user-generated; keep current seeding behavior.

---

## 3. Phase 1 implementation plan

### 3.1 New script: `server/ingest_predictions.py`
A single, idempotent script. Re-running replaces ML-derived rows but preserves user data (`app_user`, `user_favourite`).

**Order of operations** (FK constraints):
1. Load `output/predictions.json` and `output/matches.json`.
2. Begin transaction.
3. **Wipe** ML-derived tables in dependency order: `graph_data`, `player_injury`, `player_season`, `match`, `player`, `team`, `nation`. (Do *not* drop the schema — keep `app_user` / `user_favourite`.)
4. Insert `nation` (dedupe by `nation_name`); build `name → nation_id` map.
5. Insert `team` (dedupe by `team_id`).
6. Insert `player` rows; for each:
   - Truncate `risk_factor_*` to 50 chars (or widen schema — see §4 task A).
   - Format `height`/`weight` to `"X cm"`/`"X kg"`.
7. Insert `player_season` rows; build `(player_id, year) → player_season_id` map.
8. Insert `player_injury` rows; resolve `player_season_id` via the start-year map (fallback: most recent season).
9. Insert `graph_data` rows:
   - Map each `injury_risk_trend[]` entry to a `gw_N` column.
   - "Injured" → `0.99`.
   - Compute `player_injury_trend = (last_known_gw - first_known_gw) * 100`.
   - Compute `graph_data_current_gw` from today's date and 2025-08-16 season start.
10. Insert `match` rows from `matches.json`:
    - Resolve team IDs by team name → team_id from step 5.
    - Set `match_is_played` based on completed vs upcoming.
11. **Update** `match.home_avg_injury_risk` / `away_avg_injury_risk` via SQL: `UPDATE match SET home_avg_injury_risk = (SELECT AVG(player_injury_risk) FROM player WHERE team_id = match.home_team_id AND player_injury_risk < 0.99)` (and same for away). The `< 0.99` filter mirrors the convention in `server/integration/teams.py`.
12. Commit.

**Performance:** 3,500+ players in `predictions.json` → use SQLAlchemy bulk inserts (`session.bulk_insert_mappings` or `INSERT ... VALUES (...), (...)`) per table. Whole script should finish in seconds.

### 3.2 Hook into existing seeding
- Update `server/seed_db.py` to: create schema, optionally seed `app_user` from a small fixture, then call `ingest_predictions.py` instead of loading `test_data.sql`.
- Keep `test_data.sql` around for tests but stop using it as the production seed path.

### 3.3 Verification
After ingestion, smoke-test each frontend endpoint manually:
- `GET /teams/overview` → non-zero `average_risk_of_injury`, correct counts.
- `GET /players/{id}/card` → matches `predictions.json` for that player.
- `GET /players/{id}/graph` → 38 gw_X values, "injured" string where risk ≥ 0.99.
- `GET /players/{id}/injury-history` → matches `injury_history[]`.
- `GET /dashboard/matches/gw1` → returns matches with non-null avg risks.
- `GET /dashboard/high-risk-players` → top 10 sorted by risk DESC.
- `GET /dashboard/trending-risk-players` → top 10 sorted by `player_injury_trend` DESC.

Add a `tests/test_ingestion.py` that runs the ingest against a temp DB and asserts row counts match the JSON.

### 3.4 Phase 2 stub (don't build now, but don't preclude)
- The same script should run from a cron / GitHub Action / Celery beat → re-run `ml/predict_players.py` first, then `server/ingest_predictions.py`. Idempotency in §3.1 makes this trivial.

---

## 4. **Pre-flight: things that MUST be added before Phase 1 ingestion can succeed**

These are concrete blockers. Fix each before running the ingest script.

### A. Schema fixes (DB side — `server/database_init.py`)

| # | Issue | Fix |
|---|---|---|
| A1 | `Player.player_risk_factor_1/2/3` is `VARCHAR(50)`. Real ML strings exceed this (e.g. `"Workload spike: ACWR 1.40 with 5 consecutive starts"` = 51 chars). | Widen to `VARCHAR(100)` or `TEXT`. |
| A2 | `Match.home_avg_injury_risk` and `away_avg_injury_risk` are `NUMERIC(2,2)` — max value `0.99`, cannot store `1.00`. Same precision issue exists on `Player.player_injury_risk` and all `GraphData.gw_N` columns. | Change to `NUMERIC(4,3)` or `NUMERIC(5,4)` for headroom. (Or document that 0.99 is the cap and clamp on write.) |
| A3 | `Match.match_game_week` is `VARCHAR(10)` — fine, but values must be normalized to `"gw1"` (lowercase, no padding) since frontend hits `/dashboard/matches/gw1`. | Normalize on write. |
| A4 | `GraphData.player_injury_trend` is `NUMERIC(5,2)` — frontend treats this as an int that it divides by 10 (see `mappers.ts`). Confirm units before populating. | Decide: store as percentage delta (e.g. `15.34`) and have backend pass through, or store as 0–1 and × 100. The current backend code in `integration/player_page.py:131-187` multiplies by 100, so store as **0–1 fraction**. |

### B. Missing fields from ML output (`ml/predict_players.py`)

These are needed in `predictions.json` / `matches.json` to populate the DB completely:

| # | Missing field | Where it goes | Suggested source |
|---|---|---|---|
| B1 | `nation_flag_image` (URL per nation) | `nation.nation_flag_image` | API-Football `/players` already returns `birth.country` and you can use `https://media.api-sports.io/flags/{cc}.svg`. Add to ML export keyed by nationality. |
| B2 | `team_color` (hex) | `team.team_color` | Not in API-Football. Either drop the column or hardcode a static `team_id → color` map (20 PL teams). |
| B3 | `home_team_id` / `away_team_id` in `matches.json` | `match.home_team_id` / `away_team_id` | Already available in API-Football fixture payload — just include alongside `name`/`logo`. |
| B4 | `injury_risk_trend` does not include a gameweek-by-gameweek `was_injured`/`is_injured` flag in addition to the "Injured" sentinel string. | Disambiguates real injury from high-risk score. | Confirm current "Injured" string is sufficient (matches frontend convention). If yes — no change. |
| B5 | `player_injury_trend` (single delta number) per player | `graph_data.player_injury_trend` | Compute in ML or in ingestion script: `last_5_gw_avg - prior_5_gw_avg`. **Decide where it lives** before writing the ingestor. |
| B6 | `current_gameweek` (e.g. `"GW15"`) — global for the season | `graph_data.graph_data_current_gw` | Compute in ML/ingest from today's date and season start (2025-08-16). |
| B7 | `games_missed` per past season (not just current) | `player_season.player_season_games_missed` | ML has `injury_history[]` with start/end dates and season_stats; can be computed by intersecting injury date ranges with each season's fixtures. Currently `injury_summary` only exposes `matches_missed_this_season` and `matches_missed_career` — neither is per-season. **Add `games_missed` to each `season_stats[]` element.** |
| B8 | `season_stats[].interceptions`, `duels_won`, `dribbles_success`, `fouls_drawn` are sometimes null/zero in ML output. | Frontend `SeasonStat` and DB `player_season` | Confirm these come from the API-Football statistics endpoint per season; backfill or document as null-acceptable. |

### C. Fields the frontend renders that nobody is producing

These are not blockers for Phase 1 (frontend already tolerates absent values) — but flag them so they're not forgotten:

| # | Field | Frontend location | Status |
|---|---|---|---|
| C1 | `marketValue` | `Player.marketValue` (`mockData.ts:9`) | Not in API-Football. Needs Transfermarkt or manual feed. |
| C2 | `preferredFoot` | `Player.preferredFoot` | API-Football *does* expose this on the player profile — add to ML export. |
| C3 | `dateOfBirth` | `Player.dateOfBirth` | Same as C2 — available, just not exported. |
| C4 | `avgDistance`, `sprintsPerMatch` | `Player.avgDistance`, `Player.sprintsPerMatch` | Not in API-Football. Drop from frontend or source from another provider. |
| C5 | `next_match` per player on the player card | already produced by ML in `predictions[].next_match` | ⚠️ DB has **no column** for this. Either add to `player` table or query from `match` table at request time using team_id + earliest unplayed match. **Recommended:** drop from ML output; derive in `integration/player_page.py`. |

### D. Backend integration code changes

Once schemas are widened (A) and ML output is enriched (B):

| # | Change | File |
|---|---|---|
| D1 | Add `ingest_predictions.py` per §3.1 | new file `server/ingest_predictions.py` |
| D2 | Wire it into `seed_db.py` | `server/seed_db.py` |
| D3 | Stop multiplying `player_injury_risk` by 100 if ML widens to fraction (already correct — confirm). | `server/integration/player_page.py:131-187` |
| D4 | Confirm `next_match` is computed from `match` table, not stored on player | `server/integration/player_page.py` |

---

## 5. TL;DR — checklist before we can run Phase 1 ingestion

**Must do first (blockers):**
- [ ] **A1** Widen `Player.player_risk_factor_1/2/3` to `VARCHAR(100)`.
- [ ] **A2** Widen all `NUMERIC(2,2)` risk columns (`player_injury_risk`, `home/away_avg_injury_risk`, all `gw_N`) to at least `NUMERIC(4,3)`.
- [ ] **B1** Add `nation_flag_image` URL per player (or drop the column).
- [ ] **B2** Decide: drop `team.team_color` or supply a 20-team static map.
- [ ] **B3** Add `home_team_id` / `away_team_id` to entries in `output/matches.json`.
- [ ] **B5** Decide where `player_injury_trend` is computed (ML or ingestor) and produce it.
- [ ] **B6** Decide where `current_gameweek` is computed and produce it.
- [ ] **B7** Add `games_missed` per past season to `season_stats[]` (or accept zeros for historical seasons).

**Then build:**
- [ ] **D1** Write `server/ingest_predictions.py` (§3.1).
- [ ] **D2** Update `server/seed_db.py` to call it.
- [ ] Smoke-test all 10 frontend endpoints (§3.3).

**Defer (non-blocking for Phase 1):**
- C1 (market value), C2/C3 (preferred foot, DOB — easy add), C4 (avg distance, sprints — drop), C5 (next_match — derive from `match` table).
- Phase 2 scheduler.
