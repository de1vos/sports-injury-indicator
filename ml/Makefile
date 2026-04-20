PYTHON = python3.14

# ── Run full pipeline from scratch ───────────────────────────────────────────
.PHONY: all collect refresh-injuries build features train rebuild refeature predict full-update help

all: collect build features train

# ── 1. Data collection ────────────────────────────────────────────────────────
collect:
	@echo "\n══ Step 1: Collecting historical fixtures (2022-2024) ══"
	$(PYTHON) collect_fixtures_historical.py
	@echo "\n══ Step 2: Collecting historical match stats (~10 min) ══"
	$(PYTHON) collect_match_stats_historical.py

# Refresh injury data from the API (run this periodically to get new injuries)
# collect_injuries_season is the main source for current-season data (4 calls).
# collect_sidelined is only needed if you want to fully re-fetch career history (1,781 calls).
refresh-injuries:
	@echo "\n══ Refreshing injury data from API ══"
	$(PYTHON) collect_injuries_season.py --force
	$(PYTHON) build_injuries.py

# Full sidelined re-fetch (expensive: ~1,781 calls) — only needed very rarely
refresh-sidelined:
	@echo "\n══ Re-fetching full sidelined history (1,781 calls) ══"
	$(PYTHON) collect_sidelined.py --force
	$(PYTHON) collect_injuries_season.py --force
	$(PYTHON) build_injuries.py

# ── 2. Build CSVs ─────────────────────────────────────────────────────────────
build:
	@echo "\n══ Step 3: Building match_stats.csv ══"
	$(PYTHON) build_match_stats.py

# ── 3. Feature engineering ────────────────────────────────────────────────────
features:
	@echo "\n══ Step 4: Engineering features ══"
	$(PYTHON) engineer_rolling_features.py
	$(PYTHON) engineer_season_features.py
	$(PYTHON) engineer_injury_features.py
	$(PYTHON) engineer_profile_features.py
	$(PYTHON) engineer_target.py

# ── 4. Train model ────────────────────────────────────────────────────────────
train:
	@echo "\n══ Step 5: Training model ══"
	$(PYTHON) train_model.py

# ── Partial runs ──────────────────────────────────────────────────────────────
# Skip collection (data already fetched) and only rebuild + retrain
rebuild: build features train

# Only re-run feature engineering + training (match_stats.csv unchanged)
refeature: features train

# ── 5. Predictions ────────────────────────────────────────────────────────────
predict:
	@echo "\n══ Refreshing upcoming fixtures ══"
	$(PYTHON) collect_fixtures_upcoming.py
	@echo "\n══ Generating predictions ══"
	$(PYTHON) predict_players.py

# Fetch new 2025/26 fixtures + match stats (GW23+ gap), then rebuild features
refresh-current:
	@echo "\n══ Clearing fixtures_2025_done flag ══"
	$(PYTHON) -c "import json,pathlib; p=pathlib.Path('../data/progress.json'); d=json.loads(p.read_text()); d.pop('fixtures_2025_done',None); p.write_text(json.dumps(d,indent=2)); print('Done')"
	@echo "\n══ Re-fetching completed 2025/26 fixtures ══"
	$(PYTHON) collect_fixtures.py
	@echo "\n══ Fetching missing match stats (GW23+) ══"
	$(PYTHON) collect_match_stats.py
	@echo "\n══ Rebuilding features + predictions ══"
	$(MAKE) rebuild
	$(MAKE) predict

# Run after each gameweek: refresh injuries + upcoming, re-engineer, predict
full-update: refresh-injuries predict

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "Usage:"
	@echo "  make all               — full pipeline (collect → build → features → train)"
	@echo "  make collect           — fetch historical fixtures + match stats from API"
	@echo "  make refresh-injuries  — pull fresh season injury data (4 calls) + rebuild"
	@echo "  make refresh-sidelined — full sidelined re-fetch (1,781 calls, rarely needed)"
	@echo "  make build             — rebuild match_stats.csv from raw JSON files"
	@echo "  make features          — re-run all feature engineering scripts"
	@echo "  make train             — retrain the model"
	@echo "  make rebuild           — build + features + train (skip API calls)"
	@echo "  make refeature         — features + train only (match_stats.csv unchanged)"
	@echo "  make predict           — refresh upcoming fixtures + generate predictions JSON"
	@echo "  make refresh-current   — fetch GW23+ fixtures + match stats, rebuild features + predict"
	@echo "  make full-update       — refresh injuries + predict (run after each gameweek)"
	@echo ""
