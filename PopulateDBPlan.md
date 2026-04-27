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

> **Status update:** P0-S1, P0-S2, and P0-S5 are **done** in `server/database_init.py`. P0-S3 and P0-S4 are runtime conventions — enforce in the ingestor. **Schema is ready — recreate DB before running the ingestor.**

| # | Issue | Fix | Status |
|---|---|---|---|
| **P0-S1** | `Player.player_risk_factor_1/2/3` was `VARCHAR(50)`. Real ML strings exceed this. | Widened to `VARCHAR(100)`. | ✅ Done — [database_init.py:108-110](server/database_init.py#L108-L110) |
| **P0-S2** | All `NUMERIC(2,2)` risk columns capped at `0.99` and could not store `1.00`. | Changed to `NUMERIC(4,3)` with `CHECK (col BETWEEN 0 AND 1)`. Applied to `player.player_injury_risk`, `match.home_avg_injury_risk`, `match.away_avg_injury_risk`, and all 38 `graph_data.gw_N` columns (CHECK consolidated in `__table_args__`). | ✅ Done — [database_init.py:77-78, 107, 189-194, 197-234](server/database_init.py#L77) |
| **P0-S3** | Format mismatch end-to-end: ML emits `"Regular Season - 32"`, frontend hits `/dashboard/matches/gw32`, backend does exact string equality with no normalization. | No schema change. Ingestor transforms on write: `re.match(r"Regular Season - (\d+)", round_str)` → `f"gw{n}"`. Non-PL fixtures skipped. See P0-S3-impl below. | 🟡 Convention — enforce in ingestor (Phase 1) |
| **P0-S4** | `GraphData.player_injury_trend` is `NUMERIC(5,2)`. Backend passes through with `round()` — no × 100. Stored unit is percentage points directly (e.g. `25.34` → frontend shows `+25%`). | No schema change; ingestor stores percentage value directly. | 🟡 Convention — enforce in ingestor (Phase 1) |
| **P0-S5** | `Team.team_id` and `Player.player_id` both used `Identity(always=True)`. DB generated its own sequence IDs, ignoring any supplied value — impossible to insert API-Football IDs like `team_id=66` or `player_id=1904`. Entire FK graph (`player.team_id`, `match.home/away_team_id`, `graph_data.player_id`, etc.) would break. | Changed to `Identity(start=1, always=False)` on both. Ingestor can now supply explicit IDs; sequence only fires when no value is provided. All other tables keep `always=True`. See P0-S5-impl below. | ✅ Done — [database_init.py:28, 95](server/database_init.py#L28) |

#### P0-S3-impl: Gameweek string normalization
- **Source format** (verified): every entry in `output/matches.json` has `round: "Regular Season - {N}"` where `N` is `1..38`. Current snapshot contains rounds 32, 34, 35.
- **Target format** (verified): frontend computes `gw = "gw" + ceil((today − 2025-08-16) / 7)` ([dashboard.ts:86-92](frontendUpdatedSoccer2/src/app/api/dashboard.ts#L86)) and queries `/dashboard/matches/gw{N}`. Lowercase, no zero padding (`gw5`, not `gw05` or `GW5`).
- **Ingestor transform:**
  ```python
  import re
  m = re.match(r"Regular Season - (\d+)", fixture["round"])
  if not m:
      continue           # skip cup / friendly / non-league fixtures
  game_week = f"gw{int(m.group(1))}"   # int() drops any padding; lowercase prefix
  ```
- **Edge cases:**
  - **Non-Premier-League fixtures (FA Cup, EFL Cup, Champions League, friendlies, internationals) — skip entirely.** They exist in upstream ML data because the model uses them for **feature engineering and training only** (workload, minutes-played history, injury context). They are *not* dashboard data: they never get inserted into the `match` table, never appear in `graph_data`, never feed the matches view. The `re.match(r"Regular Season - (\d+)", round_str)` filter is the single chokepoint that enforces this — anything that doesn't match is silently dropped at ingest time.
  - Round number ≥ 100 → fits `VARCHAR(10)` easily (`"gw100"` = 5 chars). Not a concern.
- **⚠️ Separate concern (not P0-S3, but caused by it):** the frontend's `currentGameweek()` is a **date-based estimate**, not real fixture data. It assumes exactly 7 days per gameweek starting Aug 16 2025 — but real fixtures don't follow that cadence (international breaks, midweek rounds). On any week where the estimate disagrees with actual fixtures the user sees an empty matches list. **Recommended follow-up (Phase 2 or sooner):** replace `currentGameweek()` with a backend lookup that returns the round of the most recent past fixture (or the next upcoming one). Out of scope for Phase 1 ingestion but log it.

#### P0-S5-impl: Fix `Identity(always=True)` on `team` and `player`
- **Root cause:** every table in [database_init.py](server/database_init.py) uses `Identity(always=True)`. For most tables this is fine — their PKs are internal. But `team_id` and `player_id` come from API-Football and are the stable identifiers the ML output uses throughout (FKs on players, matches, seasons, graph data).
- **Tables affected:**
  - `Team.team_id` — referenced by `player.team_id`, `match.home_team_id`, `match.away_team_id`.
  - `Player.player_id` — referenced by `player_season.player_id`, `player_injury` (via `player_season_id`), `graph_data.player_id`, `user_favourite.player_id`.
- **Fix** in [server/database_init.py](server/database_init.py):
  ```python
  # Team — before
  team_id: Optional[int] = Field(
      default=None,
      primary_key=True,
      sa_column_args=[Identity(always=True)]
  )

  # Team — after
  team_id: Optional[int] = Field(
      default=None,
      primary_key=True,
      sa_column_args=[Identity(start=1, always=False)]
  )

  # Player — same change
  player_id: Optional[int] = Field(
      default=None,
      primary_key=True,
      sa_column_args=[Identity(start=1, always=False)]
  )
  ```
- **`always=False` behaviour:** if the ingestor supplies an explicit `team_id` (e.g. `66`), Postgres uses it. If no value is provided, the sequence kicks in. No other tables need this change.
- **After the fix:** re-run `python server/database_init.py` (or `seed_db.py`) to recreate the schema before running the ingestor.

### 2.2 Missing fields from ML output (`ml/predict_players.py`, `output/matches.json`)

> **Status: all P0-M items done.** Fields were added to `ml/predict_players.py` and verified via `jq` on the regenerated output files. See checklist §6 for detail.

| # | Missing field | DB target | Status |
|---|---|---|---|
| **P0-M1** | `nation_flag_image` per nation | `nation.nation_flag_image` | ✅ **Done** — [ml/nation_flags.py](ml/nation_flags.py) built with 74-nation `NATION_TO_ISO2` map; `output/nations.json` emitted (73 entries, flagcdn.com URLs). |
| **P0-M2** | `team_color` hex per team | `team.team_color` | ✅ **Done** — [ml/team_colors.py](ml/team_colors.py) with all 25 clubs; `team_color` field in every player record; 0 fallback hits on last run. |
| **P0-M3** | `home_team_id` / `away_team_id` in `output/matches.json` | `match.home_team_id`, `match.away_team_id` (FK) | ✅ **Done** — added to `fmt()` in [ml/predict_players.py](ml/predict_players.py); verified via `jq` (e.g. Man Utd → `33`, Leeds → `63`). |
| **P0-M4** | `injury_trend` (week-over-week %) | `graph_data.player_injury_trend` | ✅ **Done** — `compute_injury_trend()` in [ml/predict_players.py](ml/predict_players.py); 453/925 players have non-zero trend on last run. |
| **P0-M5** | `current_gw` (e.g. `"gw32"`) | `graph_data.graph_data_current_gw` | ✅ **Done** — emitted as `current_gw` field on every player record from the already-computed `current_gameweek` int (currently `"gw32"`). |
| **P0-M6** | `games_missed` per season in `season_stats[]` | `player_season.player_season_games_missed` | ✅ **Done** — `get_games_missed()` in [ml/predict_players.py](ml/predict_players.py), computed by intersecting injury date ranges with PL fixtures per season. |

#### P0-M1-impl: Hardcoded flag URLs (flagcdn.com)
- **Where:** new module `ml/nation_flags.py`, called at the end of the export step in `ml/predict_players.py`.
- **Why hardcoded over an API:**
  - Identical visual style across all flags — same source, same aspect ratio, same render style.
  - No API key, no rate limits, no caching layer needed.
  - Deterministic — given a nation, the URL never changes.
  - flagcdn supports the four UK constituent flags (`gb-eng`, `gb-sct`, `gb-wls`, `gb-nir`), which matters for PL squads where most players list "England" / "Scotland" / "Wales" / "Northern Ireland", not "United Kingdom".
  - Unsplash (the original suggestion) returned mixed-quality results — sometimes a flag, sometimes a landscape photo of the country.
- **URL pattern:** `https://flagcdn.com/w320/{iso2_lowercase}.png` (PNG, 320px wide). Use `w160` for smaller cards if the frontend needs it. SVG variant available at `https://flagcdn.com/{iso2}.svg`.
- **Steps:**
  1. Maintain a static `NATION_TO_ISO2` dict in `ml/nation_flags.py`. There are **74 unique nationality strings** in the current `output/predictions.json` (verified via `jq`). Notable edge cases:
     - `"Czech Republic"` **and** `"Czechia"` both appear → both map to `"cz"`.
     - `"Türkiye"` (API uses the new official name, not `"Turkey"`) → `"tr"`.
     - `"Korea Republic"` → `"kr"`.
     - `"Congo DR"` → `"cd"`.
     - `"Republic of Ireland"` → `"ie"`.
     - `"Côte d'Ivoire"` → `"ci"` (watch the accented character — must match exactly).
     ```python
     NATION_TO_ISO2 = {
         "Albania": "al", "Algeria": "dz", "Argentina": "ar", "Australia": "au",
         "Austria": "at", "Belgium": "be", "Bosnia and Herzegovina": "ba",
         "Brazil": "br", "Bulgaria": "bg", "Burkina Faso": "bf", "Cameroon": "cm",
         "Canada": "ca", "Chile": "cl", "Colombia": "co", "Congo DR": "cd",
         "Croatia": "hr", "Czech Republic": "cz", "Czechia": "cz",
         "Côte d'Ivoire": "ci", "Denmark": "dk", "Ecuador": "ec", "Egypt": "eg",
         "England": "gb-eng", "France": "fr", "Gabon": "ga", "Gambia": "gm",
         "Georgia": "ge", "Germany": "de", "Ghana": "gh", "Greece": "gr",
         "Guinea": "gn", "Hungary": "hu", "Iceland": "is", "Iraq": "iq",
         "Israel": "il", "Italy": "it", "Jamaica": "jm", "Japan": "jp",
         "Korea Republic": "kr", "Lithuania": "lt", "Mali": "ml", "Mexico": "mx",
         "Morocco": "ma", "Mozambique": "mz", "Netherlands": "nl",
         "New Zealand": "nz", "Nigeria": "ng", "Northern Ireland": "gb-nir",
         "Norway": "no", "Paraguay": "py", "Poland": "pl", "Portugal": "pt",
         "Republic of Ireland": "ie", "Romania": "ro", "Scotland": "gb-sct",
         "Senegal": "sn", "Serbia": "rs", "Slovakia": "sk", "Slovenia": "si",
         "South Africa": "za", "Spain": "es", "Sweden": "se", "Switzerland": "ch",
         "Tunisia": "tn", "Türkiye": "tr", "USA": "us", "Ukraine": "ua",
         "Uruguay": "uy", "Uzbekistan": "uz", "Venezuela": "ve", "Wales": "gb-wls",
         "Zambia": "zm", "Zimbabwe": "zw",
     }
     ```
  2. At export time: `unique_nations = sorted(set(p["nationality"] for p in predictions if p.get("nationality")))`.
  3. For each, look up `iso2 = NATION_TO_ISO2.get(nation)`. If missing → log a warning and skip (or fall back to a placeholder URL). The warning surfaces new nations so the map can be extended.
  4. Emit `output/nations.json`:
     ```json
     [
       {"nation_name": "France",  "nation_flag_image": "https://flagcdn.com/w320/fr.png"},
       {"nation_name": "England", "nation_flag_image": "https://flagcdn.com/w320/gb-eng.png"}
     ]
     ```
- **Maintenance:** when a new nationality appears in the data, the export logs `[WARN] no flag mapping for nation: 'X'`. Add it to `NATION_TO_ISO2` and re-run. No external service to monitor.
- **Ingestor consumption:** `ingest_predictions.py` step 4 (insert `nation`) reads `output/nations.json` instead of deriving the list from player records.

#### P0-M2-impl: Static team-color map
- **Where:** new module `ml/team_colors.py`, imported by `ml/predict_players.py` at the team-record build step.
- **Map** (covers 2025/26 PL **plus relegated/promoted clubs that still appear in past-season data** — all 25 teams found in `output/predictions.json`):
  ```python
  TEAM_COLORS = {
      "Arsenal":           "#EF0107",
      "Aston Villa":       "#95BFE5",
      "Bournemouth":       "#DA291C",
      "Brentford":         "#D20000",
      "Brighton":          "#0057B8",
      "Burnley":           "#6C1D45",
      "Chelsea":           "#034694",  # leading-zero corrected
      "Crystal Palace":    "#1B458F",
      "Everton":           "#003399",  # leading-zero corrected
      "Fulham":            "#000000",  # leading-zero corrected
      "Ipswich":           "#3764A4",
      "Leeds":             "#FFCD00",
      "Leicester":         "#003090",
      "Liverpool":         "#C8102E",
      "Luton":             "#F78F1E",
      "Manchester City":   "#6CABDD",
      "Manchester United": "#DA291C",
      "Newcastle":         "#BBBCBC",
      "Nottingham Forest": "#DD0000",
      "Sheffield Utd":     "#EE2737",
      "Southampton":       "#D71920",
      "Sunderland":        "#EB172C",
      "Tottenham":         "#132257",
      "West Ham":          "#7A263A",
      "Wolves":            "#F6B000",   # API-Football uses "Wolves", not "Wolverhampton"
  }
  ```
- **Name canon verified** by running `jq -r '.[].team' output/predictions.json | sort -u` — keys above match the exact strings present in `predictions.json`. Re-run that command if the data is regenerated and a new club appears.
- **Fallback:** if a lookup misses, log `[WARN] no color mapping for team: 'X'` and use `"#888888"` so ingestion never fails.
- **Where it gets emitted:** include `team_color` alongside `team_id` / `team` / `team_logo` in each player record (or in a dedicated `output/teams.json` if you prefer to separate teams from player records — same pattern as `nations.json`).
- **Ingestor consumption:** when building unique teams in `ingest_predictions.py` step 5, read the color from the player record (or `output/teams.json`) and write it to `team.team_color`.

#### P0-M4-impl: `player_injury_trend` formula (relative week-over-week %)
- **Definition:** percent change in injury risk from the **previous gameweek** to the **current gameweek**.
  ```
  injury_trend = (current_gw_risk − previous_gw_risk) / previous_gw_risk × 100
  ```
- **Worked examples:**
  | previous | current | computed | stored | frontend display |
  |---|---|---|---|---|
  | 0.20 | 0.25 | +25.00 | `25.00` | `+25%` |
  | 0.40 | 0.30 | −25.00 | `-25.00` | `-25%` |
  | 0.10 | 0.30 | +200.00 | `200.00` | `+200%` |
  | 0.50 | 0.50 | 0.00 | `0.00` | `0%` |
- **Sign convention:**
  - **positive** → risk rose week-over-week (player *trending worse*) — what the trending-risk dashboard surfaces.
  - **negative** → risk fell (player improving).
  - `0` → unchanged.
- **Storage:** percentage points directly in `graph_data.player_injury_trend` (`NUMERIC(5,2)`). Backend passes through with `round(...)` — no × 100 multiplier. Column max is ±999.99 → cap on write (see edge cases).
- **Edge cases:**
  - **No previous gameweek** (player's first appearance, or only one historical gw available) → `injury_trend = 0`.
  - **`previous_gw_risk == 0`** (theoretically possible at season start) → divide-by-zero. Set `injury_trend = 0` in this case.
  - **Either week is the "Injured" sentinel (`0.99`)** → exclude that comparison and walk back to the most recent non-injured gameweek for `previous`. If current week is "Injured" → `injury_trend = 0` (player sidelined; week-over-week change is meaningless).
  - **Result exceeds ±999** (e.g. previous = 0.001, current = 0.5 → +49,900%) → clamp to ±999.99 to fit `NUMERIC(5,2)`. In practice this only fires when previous risk is near-zero.
  - **Round to 2 decimals** before storing so the column never overflows on a `999.999` rounding edge.
- **Which "previous" gameweek?** The immediately prior gameweek in `injury_risk_trend[]`, skipping any "Injured" entries (see above). Don't average across multiple weeks — the user wants strict week-vs-week.
- **Where it lives:** computed in `ml/predict_players.py` at the same point that `injury_risk_trend[]` is built. Emitted as a top-level `injury_trend` field on each player record in `predictions.json`.
- **Ingestor mapping:** `ingest_predictions.py` step 9 reads `predictions[].injury_trend` and writes it directly to `graph_data.player_injury_trend` — no math in the ingestor.

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
- [ ] P0-M4 — ML computes `injury_trend` (week-over-week %) — currently emits `null`.
- [ ] P0-M5 — Ingestor computes `graph_data_current_gw` from highest completed round in `matches.json`.
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
| `player_injury_trend` | per P0-M4 | stored as percentage directly (e.g. `25.00`); backend pass-through, no × 100 |
| `graph_data_current_gw` | per P0-M5 | |

### 3.7 `match` table
Source: `output/matches.json` (`completed[]` + `upcoming[]`).

> **Premier League fixtures only.** Non-PL matches (cups, friendlies, internationals) are present in upstream ML data because the model uses them for **feature engineering and training**, but they do not belong in this table. Filter them out at ingest time by accepting only fixtures whose `round` matches `^Regular Season - \d+$` (see P0-S3-impl). They have no place in `graph_data` or the dashboard matches view either.

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
- [x] ~~P0-S1 — Widen `Player.player_risk_factor_1/2/3` to `VARCHAR(100)`.~~ **Done** in `server/database_init.py`.
- [x] ~~P0-S2 — All risk columns → `NUMERIC(4,3) CHECK (col BETWEEN 0 AND 1)`.~~ **Done** in `server/database_init.py` (player, match, graph_data).
- [x] ~~**P0-S5** — Change `Identity(always=True)` → `Identity(start=1, always=False)` on `Team.team_id` and `Player.player_id`.~~ **Done** — [database_init.py:28, 95](server/database_init.py#L28). Recreate schema before running ingestor.
- [x] ~~P0-M1 — Build static `NATION_TO_ISO2` map in `ml/nation_flags.py`; emit `output/nations.json`.~~ **Done** — [ml/nation_flags.py](ml/nation_flags.py), 74 nationalities mapped, `output/nations.json` generated (73 entries).
- [x] ~~P0-M2 — Add `TEAM_COLORS` dict in `ml/team_colors.py`; emit `team_color` per player record.~~ **Done** — [ml/team_colors.py](ml/team_colors.py), all 25 clubs mapped, 0 fallback hits.
- [x] ~~P0-M3 — Add `home_team_id` / `away_team_id` to every `output/matches.json` entry.~~ **Done** — added to `fmt()` in [ml/predict_players.py:278-279](ml/predict_players.py#L278).
- [x] ~~P0-M4 — Produce `injury_trend` per player.~~ **Done** — `compute_injury_trend()` in [ml/predict_players.py](ml/predict_players.py), 453/925 players have non-zero trend.
- [x] ~~P0-M5 — Produce `current_gw` per player.~~ **Done** — `current_gw` field emitted from already-computed `current_gameweek` int (currently `"gw32"`).
- [x] ~~P0-M6 — Add `games_missed` per past season to `season_stats[]`.~~ **Done** — `get_games_missed()` in [ml/predict_players.py](ml/predict_players.py), computed by intersecting injury dates with PL fixtures per season.
- [x] ~~Regenerate `output/predictions.json`, `output/matches.json`, `output/nations.json`.~~ **Done** — all three files regenerated and verified via `jq`.

**Phase 1 (build):**
- [ ] P1-D1 — Write `server/ingest_predictions.py`.
- [ ] P1-D2 — Update `server/seed_db.py`.
- [ ] P1-D3 — Confirm `next_match` derives server-side.
- [ ] Smoke-test all 10 frontend endpoints.

**Deferred (non-blocking):**
- P0-N1 (market value), P0-N2/N3 (preferred foot, DOB), P0-N4 (avg distance, sprints), P0-N5 (next_match — already addressed via P1-D3).
- Phase 2 scheduler.
