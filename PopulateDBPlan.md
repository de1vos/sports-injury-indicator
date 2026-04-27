# Database Population Plan

**Goal:** populate the PostgreSQL database (defined in `server/database_init.py`) from the current ML artifacts (`output/predictions.json`, `output/matches.json`) so that the FastAPI backend serves real data to `frontendUpdatedSoccer2`.

**Phasing:**
- **Phase 0** — unblock the pipeline. Schema fixes + missing ML output fields. Nothing can be ingested until these are done.
- **Phase 1** — write the one-shot ingestion script and seed the DB from current ML output.
- **Phase 2** — schedule the script to re-run daily after `predict_players.py`. Out of scope for now, but Phase 1 is built to make this trivial.

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

The ML side produces a complete, well-shaped JSON file. The DB side has a matching schema. **Nothing connects them.** `server/seed_db.py` only loads `test_data.sql` (static fixtures). We need an ingestion script: `output/predictions.json` + `output/matches.json` → DB rows. But before we can write that script, several upstream issues must be fixed — that's Phase 0.

---

## 2. Phase 0 — Pre-flight fixes (BLOCKERS)

These must be done first. Without them, ingestion either fails or produces incomplete/incorrect data.

### 2.1 Schema fixes (DB side — `server/database_init.py`)

| # | Issue | Fix |
|---|---|---|
| **P0-S1** | `Player.player_risk_factor_1/2/3` is `VARCHAR(50)`. Real ML strings exceed this (e.g. `"Workload spike: ACWR 1.40 with 5 consecutive starts"` = 51 chars). | Widen to `VARCHAR(100)` (or `TEXT`). |
| **P0-S2** | All `NUMERIC(2,2)` risk columns cap at `0.99` and cannot store `1.00`. Affects: `player.player_injury_risk`, `match.home_avg_injury_risk`, `match.away_avg_injury_risk`, all 38 `graph_data.gw_N` columns. | Change to `NUMERIC(4,3) CHECK (col BETWEEN 0 AND 1)`. The `CHECK` is non-optional — without it the type allows up to `9.999`. With it, behavior matches the old `NUMERIC(2,2)` but `1.000` becomes legal. |
| **P0-S3** | `Match.match_game_week` is `VARCHAR(10)` — fine, but values must be normalized to `"gw1"`…`"gw38"` (lowercase, no padding) since frontend hits `/dashboard/matches/gw1`. | No schema change; normalize on write in the ingestor. |
| **P0-S4** | `GraphData.player_injury_trend` is `NUMERIC(5,2)`. Backend (`integration/player_page.py:131-187`) multiplies stored value × 100 before returning. Means stored unit is **0–1 fraction**, not percentage. | Document this convention; ingestor stores 0–1 fraction. (Schema unchanged.) |

### 2.2 Missing fields from ML output (`ml/predict_players.py`, `output/matches.json`)

These fields are required by the DB schema but not currently produced. Each must be added to the ML export OR explicitly dropped from the schema.

| # | Missing field | DB target | Resolution |
|---|---|---|---|
| **P0-M1** | `nation_flag_image` (URL per nation) | `nation.nation_flag_image` | Add to ML export. **Source: Unsplash API.** During the ML run, dedupe all `nationality` values across players, query Unsplash once per nation (e.g. `?query={nation}+flag&per_page=1`, take `urls.regular`), and emit a separate top-level list `nations[]` in `output/predictions.json` (or a sibling `output/nations.json`) of the form `[{"nation_name": "France", "nation_flag_image": "https://images.unsplash.com/..."}]`. The ingestor then loads this list directly into the `nation` table instead of inferring nations from player records. See P0-M1-impl below. |
| **P0-M2** | `team_color` (hex) | `team.team_color` | Not in API-Football. Either drop the column **or** ship a static `team_id → "#hex"` map for the 20 PL teams. (Recommend: drop unless frontend uses it.) |
| **P0-M3** | `home_team_id` / `away_team_id` in `output/matches.json` | `match.home_team_id`, `match.away_team_id` (FK) | API-Football fixture payload already has both IDs. Update `ml/predict_players.py` to include them alongside `name`/`logo` in `completed[]` and `upcoming[]` entries. **Without this, matches cannot FK-resolve and `match` rows cannot be inserted.** |
| **P0-M4** | `player_injury_trend` (single delta number per player) | `graph_data.player_injury_trend` | Decide where this is computed: ML side (preferred) or ingestor. Suggested formula: `last_5_gw_avg - prior_5_gw_avg`, stored as 0–1 fraction. Also drives the trending-risk dashboard. |
| **P0-M5** | `current_gameweek` (e.g. `"GW15"`) | `graph_data.graph_data_current_gw` | Compute from today's date vs. 2025-08-16 season start. Single global value — produce once in ingestor. |
| **P0-M6** | `games_missed` per **past** season inside `season_stats[]` | `player_season.player_season_games_missed` | Today the ML only exposes `matches_missed_this_season` at the summary level — no per-past-season breakdown. Add a `games_missed` field to each `season_stats[]` element by intersecting injury date ranges with each season's fixtures. (Acceptable interim: zero out for past seasons and flag.) |

#### P0-M1-impl: Unsplash flag-fetch details
- **Where:** add to `ml/predict_players.py` near the end of the export step (or factor into a small `ml/fetch_nation_flags.py` module called from there).
- **Steps:**
  1. Collect `unique_nations = sorted(set(p["nationality"] for p in predictions if p.get("nationality")))`.
  2. For each nation, call Unsplash search: `GET https://api.unsplash.com/search/photos?query={nation}+flag&per_page=1&orientation=landscape` with header `Authorization: Client-ID {UNSPLASH_ACCESS_KEY}`.
  3. Extract `results[0].urls.regular` (fallback: `urls.small`; if zero results, set `null`).
  4. Cache results in a local file (e.g. `data/raw/nation_flags.json`) so we only hit Unsplash for new nations on subsequent runs — Unsplash free tier is 50 req/hour.
  5. Emit a top-level array in the ML output (recommend new file `output/nations.json` to keep `predictions.json` player-shaped):
     ```json
     [
       {"nation_name": "France", "nation_flag_image": "https://images.unsplash.com/photo-..."},
       {"nation_name": "England", "nation_flag_image": "https://images.unsplash.com/photo-..."}
     ]
     ```
- **Env:** `UNSPLASH_ACCESS_KEY` in `.env` (do not commit). Document in README.
- **Caveat:** Unsplash returns generic photos tagged "{country} flag" — quality is inconsistent (sometimes a flag, sometimes a landscape). If results look poor in practice, swap source to `https://flagcdn.com/w320/{iso2}.png` (deterministic, free, no API key) — keep the same `nations[]` output shape so the ingestor doesn't change.
- **Ingestor consumption:** `ingest_predictions.py` step 4 (insert `nation`) reads `output/nations.json` instead of deriving the list from player records.

### 2.3 Non-blocking but flagged (defer past Phase 0)

| # | Field | Status |
|---|---|---|
| P0-N1 | `marketValue` (`Player.marketValue`) | Not in any data source you collect. Needs Transfermarkt or manual feed. Frontend already tolerates absent. |
| P0-N2 | `preferredFoot` (`Player.preferredFoot`) | Available in API-Football — easy to add to ML export when convenient. |
| P0-N3 | `dateOfBirth` (`Player.dateOfBirth`) | Available in API-Football — same as N2. |
| P0-N4 | `avgDistance`, `sprintsPerMatch` | Not in any source you collect. Recommend dropping from frontend. |
| P0-N5 | `next_match` per player | ML produces `predictions[].next_match`, but DB has no column. **Recommendation:** drop from ML output; derive server-side in `integration/player_page.py` from the `match` table using `team_id` + earliest unplayed match. No DB or ML change required. |

### 2.4 Phase 0 exit criteria
- [ ] P0-S1, P0-S2 applied to `server/database_init.py` and DB recreated.
- [ ] P0-M1, P0-M2 resolved (added to ML or dropped from schema).
- [ ] P0-M3 added to `output/matches.json` — every entry has `home_team_id` and `away_team_id`.
- [ ] P0-M4, P0-M5 — decided where computed and confirmed produced.
- [ ] P0-M6 added to `season_stats[]` (or accepted as zero for past seasons with explicit note).
- [ ] `output/predictions.json` and `output/matches.json` regenerated with all of the above.

Once all checked, proceed to Phase 1.

---

## 3. Field-level mapping: ML output → DB columns

Reference for the ingestion script. Source records: each entry of `output/predictions.json` (per player) and `output/matches.json` (completed + upcoming). Assumes Phase 0 is complete.

### 3.1 `nation` table
| DB column | Source |
|---|---|
| `nation_name` | `predictions[].nationality` (deduped) |
| `nation_flag_image` | per P0-M1 |

### 3.2 `team` table
| DB column | Source |
|---|---|
| `team_id` | `predictions[].team_id` |
| `team_name` | `predictions[].team` |
| `team_logo` | `predictions[].team_logo` |
| `team_color` | per P0-M2 |

### 3.3 `player` table
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
| `player_injury_risk` | `predictions[].injury_risk` | 0.000–1.000 (P0-S2) |
| `player_risk_factor_1/2/3` | `predictions[].risk_factor_1/2/3` | up to 100 chars (P0-S1) |

### 3.4 `player_season` table
One row per season per player. Source: `predictions[].season_stats[]`.

| DB column | Source |
|---|---|
| `player_id` | parent record |
| `player_season_year` | `season_stats[].season` |
| `player_season_appearences` | `season_stats[].appearances` |
| `player_season_minutes` | `season_stats[].minutes` |
| `player_season_fouls_drawn` | `season_stats[].fouls_drawn` (coalesce to 0) |
| `player_season_fouls_commited` | `season_stats[].fouls_committed` |
| `player_season_duels_total` | `season_stats[].duels_total` |
| `player_season_tackles` | `season_stats[].tackles` |
| `player_season_yellow_cards` | `season_stats[].yellow_cards` |
| `player_season_red_cards` | `season_stats[].red_cards` |
| `player_season_goals` | `season_stats[].goals` |
| `player_season_assists` | `season_stats[].assists` |
| `player_season_dribbles_attempts` | `season_stats[].dribbles_attempts` |
| `player_season_games_missed` | `season_stats[].games_missed` (P0-M6) |
| `player_season_rating` | `season_stats[].rating` |

### 3.5 `player_injury` table
One row per injury. Source: `predictions[].injury_history[]`.

| DB column | Source | Notes |
|---|---|---|
| `player_season_id` | derived: match injury `start` year to a `player_season.player_season_year` | resolve after seasons inserted; fallback = most recent season |
| `player_injury_type` | `injury_history[].type` | |
| `player_injury_days_out` | `injury_history[].days_out` | |
| `player_injury_start` | `injury_history[].start` | |
| `player_injury_end` | `injury_history[].end` | nullable |
| `player_injury_severity` | `injury_history[].severity` | |
| `player_injury_region` | `injury_history[].body_region` | |

### 3.6 `graph_data` table
One row per player. Source: `predictions[].injury_risk_trend[]` (38 entries, gw_1…gw_38).

| DB column | Source | Notes |
|---|---|---|
| `player_id` | parent | |
| `gw_1` … `gw_38` | `injury_risk_trend[i].risk` mapped by `gw` label | "Injured" string → `0.99` sentinel (matches `>= 0.99` check in `integration/player_page.py`) |
| `player_injury_trend` | per P0-M4 | stored as 0–1 fraction (backend × 100 on read) |
| `graph_data_current_gw` | per P0-M5 | |

### 3.7 `match` table
Source: `output/matches.json` (`completed[]` + `upcoming[]`).

| DB column | Source | Notes |
|---|---|---|
| `match_fixture_id` | `fixture_id` | |
| `home_team_id` | `home_team_id` (P0-M3) | FK |
| `away_team_id` | `away_team_id` (P0-M3) | FK |
| `match_date` | parse from `date` (ISO) | |
| `match_time` | parse from `date` (ISO) | |
| `match_game_week` | `round` → normalize `"gw1"`…`"gw38"` (P0-S3) | |
| `match_venue` | `venue` | |
| `match_goals_home` | `score.home` (completed only) | |
| `match_goals_away` | `score.away` | |
| `match_is_played` | `true` for `completed[]`, `false` for `upcoming[]` | |
| `home_avg_injury_risk` | **derived post-insert** — `AVG(player.player_injury_risk) WHERE team_id = match.home_team_id AND player_injury_risk < 0.99` | |
| `away_avg_injury_risk` | same | |

### 3.8 Tables not populated from ML output
- `app_user`, `user_favourite` — user-generated; keep current seeding behavior (small fixture from `test_data.sql` or equivalent).

---

## 4. Phase 1 — Ingestion script

### 4.1 New script: `server/ingest_predictions.py`
A single, idempotent script. Re-running replaces ML-derived rows but preserves user data (`app_user`, `user_favourite`). Same script becomes the Phase 2 cron payload — no rewrite needed.

**Order of operations** (FK constraints):
1. Load `output/predictions.json` and `output/matches.json`.
2. Begin transaction.
3. **Wipe** ML-derived tables in dependency order: `graph_data`, `player_injury`, `player_season`, `match`, `player`, `team`, `nation`. Do *not* drop the schema — keep `app_user` / `user_favourite`.
4. Insert `nation` (dedupe by `nation_name`); build `name → nation_id` map.
5. Insert `team` (dedupe by `team_id`).
6. Insert `player` rows; format `height`/`weight` to `"X cm"`/`"X kg"`.
7. Insert `player_season` rows; build `(player_id, year) → player_season_id` map.
8. Insert `player_injury` rows; resolve `player_season_id` via the start-year map (fallback: most recent season).
9. Insert `graph_data` rows: map each `injury_risk_trend[]` entry to a `gw_N` column; "Injured" → `0.99`; populate `player_injury_trend` and `graph_data_current_gw` per Phase 0 decisions.
10. Insert `match` rows from `matches.json`; resolve team IDs via `home_team_id`/`away_team_id` (P0-M3).
11. **Update** `match.home_avg_injury_risk` / `away_avg_injury_risk` via SQL: `UPDATE match SET home_avg_injury_risk = (SELECT AVG(player_injury_risk) FROM player WHERE team_id = match.home_team_id AND player_injury_risk < 0.99)` (and same for away). The `< 0.99` filter mirrors `server/integration/teams.py`.
12. Commit.

**Performance:** 3,500+ players → use SQLAlchemy bulk inserts (`session.bulk_insert_mappings` or multi-row `INSERT`). Whole script should finish in seconds.

### 4.2 Hook into existing seeding
- Update `server/seed_db.py` to: create schema, optionally seed `app_user` from a small fixture, then call `ingest_predictions.py` instead of loading `test_data.sql`.
- Keep `test_data.sql` for tests but stop using it as the production seed path.

### 4.3 Backend integration code changes

| # | Change | File |
|---|---|---|
| P1-D1 | New file `server/ingest_predictions.py` (§4.1) | new |
| P1-D2 | Wire into `seed_db.py` | `server/seed_db.py` |
| P1-D3 | Confirm `next_match` is derived from `match` table, not stored on player (per P0-N5) | `server/integration/player_page.py` |

### 4.4 Verification
After ingestion, smoke-test each frontend endpoint:
- `GET /teams/overview` → non-zero `average_risk_of_injury`, correct counts.
- `GET /players/{id}/card` → matches `predictions.json` for that player.
- `GET /players/{id}/graph` → 38 gw_X values, "injured" string where risk ≥ 0.99.
- `GET /players/{id}/injury-history` → matches `injury_history[]`.
- `GET /dashboard/matches/gw1` → returns matches with non-null avg risks.
- `GET /dashboard/high-risk-players` → top 10 sorted by risk DESC.
- `GET /dashboard/trending-risk-players` → top 10 sorted by `player_injury_trend` DESC.

Add `tests/test_ingestion.py` that runs the ingest against a temp DB and asserts row counts match the JSON.

---

## 5. Phase 2 — Daily refresh (out of scope, sketched)

- Cron / GitHub Action / Celery beat runs daily:
  1. `python ml/predict_players.py` (regenerates `output/predictions.json` and `output/matches.json` from latest API-Football data).
  2. `python server/ingest_predictions.py` (idempotent — wipes and re-inserts ML-derived tables).
- No additional code beyond a scheduler config. Phase 1's idempotency guarantees this works.

---

## 6. TL;DR checklist

**Phase 0 (blockers):**
- [ ] P0-S1 — Widen `Player.player_risk_factor_1/2/3` to `VARCHAR(100)`.
- [ ] P0-S2 — All risk columns → `NUMERIC(4,3) CHECK (col BETWEEN 0 AND 1)`.
- [ ] P0-M1 — Fetch nation flags via Unsplash; emit `output/nations.json` list of `{nation_name, nation_flag_image}`. Cache in `data/raw/nation_flags.json`. `UNSPLASH_ACCESS_KEY` in `.env`.
- [ ] P0-M2 — Decide `team.team_color`: drop or static map.
- [ ] P0-M3 — Add `home_team_id` / `away_team_id` to every `output/matches.json` entry.
- [ ] P0-M4 — Produce `player_injury_trend` (single delta per player).
- [ ] P0-M5 — Produce `current_gameweek`.
- [ ] P0-M6 — Add `games_missed` per past season to `season_stats[]`.
- [ ] Regenerate `output/predictions.json`, `output/matches.json`, `output/nations.json`.

**Phase 1 (build):**
- [ ] P1-D1 — Write `server/ingest_predictions.py`.
- [ ] P1-D2 — Update `server/seed_db.py`.
- [ ] P1-D3 — Confirm `next_match` derives server-side.
- [ ] Smoke-test all 10 frontend endpoints.

**Deferred (non-blocking):**
- P0-N1 (market value), P0-N2/N3 (preferred foot, DOB), P0-N4 (avg distance, sprints), P0-N5 (next_match — already addressed via P1-D3).
- Phase 2 scheduler.
