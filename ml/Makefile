PYTHON = python3.14

# ── Run full pipeline from scratch ───────────────────────────────────────────
.PHONY: all collect collect-cups refresh-injuries build features train predict rebuild refeature refresh-current full-update help

all: collect build features train

# ── 1. Data collection ────────────────────────────────────────────────────────
collect:
	@echo "\n══ Step 1: Collecting historical fixtures (2022-2024) ══"
	$(PYTHON) collect_fixtures_historical.py
	@echo "\n══ Step 2: Collecting historical match stats (~10 min) ══"
	$(PYTHON) collect_match_stats_historical.py

# Collect cup + European fixtures involving PL clubs (one-time, ~820 calls on Pro tier, ~7 min)
collect-cups:
	@echo "\n══ Step 1a: Fetching cup/Euro fixture lists (~20 calls) ══"
	$(PYTHON) collect_fixtures_cups.py
	@echo "\n══ Step 1b: Fetching cup/Euro match stats (~800 calls) ══"
	$(PYTHON) collect_match_stats_cups.py
	@echo "\n══ Rebuilding match_stats.csv with cup/Euro rows ══"
	$(PYTHON) build_match_stats.py

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

# ── 5. Generate predictions ───────────────────────────────────────────────────
predict:
	@echo "\n══ Step 6: Generating predictions ══"
	$(PYTHON) predict_players.py

# ── Refresh current-season data + predict (weekly use) ───────────────────────
refresh-current:
	@echo "\n══ Refreshing current-season fixtures + match stats ══"
	$(PYTHON) collect_fixtures.py --force
	$(PYTHON) collect_fixtures_upcoming.py --force
	$(PYTHON) collect_match_stats.py
	@echo "\n══ Rebuilding CSVs ══"
	$(PYTHON) build_match_stats.py
	@echo "\n══ Re-running feature engineering ══"
	$(PYTHON) engineer_rolling_features.py
	$(PYTHON) engineer_season_features.py
	$(PYTHON) engineer_injury_features.py
	$(PYTHON) engineer_profile_features.py
	$(PYTHON) engineer_target.py
	@echo "\n══ Retraining model ══"
	$(PYTHON) train_model.py
	@echo "\n══ Generating predictions ══"
	$(PYTHON) predict_players.py

# Full weekly update: refresh injuries + current data + predict
full-update: refresh-injuries refresh-current

# ── Partial runs ──────────────────────────────────────────────────────────────
# Skip collection (data already fetched) and only rebuild + retrain
rebuild: build features train

# Only re-run feature engineering + training (match_stats.csv unchanged)
refeature: features train

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "Usage:"
	@echo "  make all               — full pipeline (collect → build → features → train)"
	@echo "  make collect           — fetch historical fixtures + match stats from API"
	@echo "  make collect-cups      — fetch cup/Euro fixtures for PL clubs (~820 calls, one-time)"
	@echo "  make refresh-injuries  — pull fresh season injury data (4 calls) + rebuild"
	@echo "  make refresh-sidelined — full sidelined re-fetch (1,781 calls, rarely needed)"
	@echo "  make build             — rebuild match_stats.csv from raw JSON files"
	@echo "  make features          — re-run all feature engineering scripts"
	@echo "  make train             — retrain the model"
	@echo "  make rebuild           — build + features + train (skip API calls)"
	@echo "  make refeature         — features + train only (match_stats.csv unchanged)"
	@echo "  make predict           — generate predictions (model must exist)"
	@echo "  make refresh-current   — fetch new fixtures/stats + retrain + predict"
	@echo "  make full-update       — refresh-injuries + refresh-current (full weekly update)"
	@echo ""
