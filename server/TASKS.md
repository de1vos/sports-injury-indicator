# Tasks

## Phase 1 — `season_meta` table + backend migration + fix dashboard gameweek

- [ ] Add `SeasonMeta` model to `server/database_init.py`
- [ ] Add `SeasonMeta` to imports in `server/ingest_predictions.py`
- [ ] Fix predictions.json load (`predictions_raw = json.load(f); players = predictions_raw["players"]`)
- [ ] Add `season_meta` to wipe list in `server/ingest_predictions.py`
- [ ] Add `season_meta` insert step in `server/ingest_predictions.py`
- [ ] Add `season_meta` to row count summary in `server/ingest_predictions.py`
- [ ] Create `server/integration/common.py` with `get_season_meta()` and `get_active_player_ids_sq()`
- [ ] Migrate S-1 — `server/integration/dashboard.py` (remove helpers, update call site, remove `date` import)
- [ ] Migrate S-2 — `server/integration/teams.py` (remove helpers, update both date calcs, remove `date` import)
- [ ] Migrate S-3 — `server/integration/player_page.py` (remove helpers, update 3 uses in `get_injury_analysis`, keep `date` import)
- [ ] Migrate S-4 — `server/integration/my_players.py` (replace inline calc, add import, remove `date` import)
- [ ] Change `GET /dashboard/matches/{game_week}` → `GET /dashboard/matches` (gameweek read from `season_meta`)
- [ ] Re-run `python server/ingest_predictions.py` to recreate schema and populate
- [ ] Smoke-test `GET /dashboard/matches`

## Phase 2 — Drop redundant column

- [ ] Remove `graph_data_current_gw` from `GraphData` model and `__table_args__`
- [ ] Remove `graph_data_current_gw` from ingestor graph data row dict
- [ ] Replace `graph.graph_data_current_gw` in `player_page.py` with `get_season_meta(session).current_game_week`
- [ ] Re-run `python server/seed_db.py`

## Phase 3 — Search router (player + team lookup)

- [ ] Create `server/integration/search.py`
- [ ] Create `server/routers/search.py`
- [ ] Register `search.router` in `server/main.py`
- [ ] Smoke-test `GET /search/players`
- [ ] Smoke-test `GET /search/teams`
- [ ] Smoke-test `GET /search/season`
