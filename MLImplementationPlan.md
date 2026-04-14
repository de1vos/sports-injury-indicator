# Premier League Injury Predictor — Implementation Plan

## Project overview

Predict the probability (0-100%) that any active Premier League player gets injured in the next 90 days. Output a player database with profiles, photos, season stats, injury history, and a live risk score that the frontend consumes directly — no additional API calls needed.

**Single data source:** API-Football (api-sports.io), Pro plan.

---

## Phase 1 — Data collection

All data comes from API-Football. Four endpoints, run once, cached locally.

### Step 1.1 — Player profiles + season stats (historical)

**Endpoint:** `GET /players?league=39&season={year}&page={n}`

**Seasons:** 2022, 2023, 2024 (three full completed seasons)

**Returns per player:**

- Profile: id, name, firstname, lastname, photo URL, DOB, age, height, weight, nationality, injured (bool)
- Team: id, name, logo
- Season stats: appearances, lineups, minutes, position, rating, captain
- Substitutes: in, out, bench
- Shots: total, on target
- Goals: total, conceded, assists, saves
- Passes: total, key, accuracy
- Tackles: total, blocks, interceptions
- Duels: total, won
- Dribbles: attempts, success, dribbled past
- Fouls: drawn, committed
- Cards: yellow, yellowred, red
- Penalties: won, committed, scored, missed, saved

**Pagination:** 20 players per page, ~40 pages per season.

**Calls:** ~40 pages × 3 seasons = **~120 calls**

**Output:** `data/players_season_stats.json` — one entry per player per season, including full profile.

### Step 1.2 — Player profiles + season stats (current season)

**Endpoint:** `GET /players?league=39&season=2025&page={n}`

**Purpose:** Captures January transfers, promoted club players (Leeds, Burnley, Sunderland), and anyone not in previous 3 seasons. Also provides current season aggregated stats.

**Calls:** ~40 pages = **~40 calls**

**Output:** Appended to `data/players_season_stats.json`

### Step 1.3 — Fixture IDs for current season

**Endpoint:** `GET /fixtures?league=39&season=2025&status=FT`

**Purpose:** Get fixture IDs and dates for all completed 2025/26 matches. These IDs feed into step 1.4.

**Returns per fixture:** fixture ID, date, timestamp, home team (id, name), away team (id, name), score, venue, round.

**Calls:** **~6 calls** (paginated)

**Output:** `data/fixtures_2025.json`

### Step 1.4 — Per-match player stats (current season only)

**Endpoint:** `GET /fixtures/players?fixture={id}`

**Purpose:** Match-level granularity for the current season. This is the data that powers rolling window features for live predictions.

**Returns per player per match:** Same stat categories as the season endpoint (minutes, rating, shots, goals, passes, tackles, duels, dribbles, fouls, cards, penalties) but for that single match.

**Calls:** ~330 completed matches × 1 call each = **~330 calls**

**Output:** `data/match_stats_2025.json` — one entry per player per match, with fixture ID and date.

### Step 1.5 — Injury and sidelined history

**Endpoint:** `GET /sidelined?player={id}`

**Purpose:** Full career injury and suspension timeline for every player. One call per unique player ID returns their entire history — not limited to the 4 seasons.

**Returns per record:**

- type: specific injury name (e.g. "Hamstring Injury", "ACL Rupture", "Knee Surgery", "Suspended")
- start: date string (YYYY-MM-DD)
- end: date string (YYYY-MM-DD) or null if ongoing

**Calls:** ~1,200 unique player IDs across all 4 seasons = **~1,200 calls**

**Output:** `data/sidelined.json` — keyed by player ID, each containing an array of injury records.

### Step 1.6 — Total call budget

| Step      | Endpoint                              | Calls      |
| --------- | ------------------------------------- | ---------- |
| 1.1       | `/players` (22/23, 23/24, 24/25)      | ~120       |
| 1.2       | `/players` (25/26)                    | ~40        |
| 1.3       | `/fixtures` (25/26)                   | ~6         |
| 1.4       | `/fixtures/players` (25/26 per-match) | ~330       |
| 1.5       | `/sidelined` (all unique players)     | ~1,200     |
| **Total** |                                       | **~1,696** |

Pro plan: 7,500 calls/day. Entire collection runs in **under 6 hours** with rate limiting (0.5s between calls).

### Step 1.7 — Caching and resume

Every API response is cached to disk as JSON immediately after fetching. The script tracks which calls have been completed in a `data/progress.json` file. If interrupted, rerunning the script skips already-fetched data and resumes from where it left off. No wasted calls.

---

## Phase 2 — Data storage

### 2.1 — Players table

One row per player. Deduplicated across all 4 seasons (latest profile wins if a player appears multiple times).

| Column       | Source                    | Example                         |
| ------------ | ------------------------- | ------------------------------- |
| player_id    | `/players` → player.id    | 1100                            |
| name         | player.name               | Bukayo Saka                     |
| firstname    | player.firstname          | Bukayo                          |
| lastname     | player.lastname           | Saka                            |
| photo        | player.photo              | https://media.api-sports.io/... |
| dob          | player.birth.date         | 2001-09-05                      |
| age          | player.age                | 24                              |
| nationality  | player.nationality        | England                         |
| height       | player.height             | 178                             |
| weight       | player.weight             | 72                              |
| position     | statistics.games.position | Attacker                        |
| current_team | statistics.team.name      | Arsenal                         |
| team_logo    | statistics.team.logo      | https://media.api-sports.io/... |

**Stored as:** `data/players.csv` and `data/players.json` (JSON for frontend)

### 2.2 — Season stats table

One row per player per season. From `/players` endpoint (steps 1.1 + 1.2).

| Column            | Source                                 |
| ----------------- | -------------------------------------- |
| player_id         | player.id                              |
| season            | league.season (2022, 2023, 2024, 2025) |
| team              | team.name                              |
| appearances       | games.appearences                      |
| lineups           | games.lineups                          |
| minutes           | games.minutes                          |
| rating            | games.rating                           |
| goals             | goals.total                            |
| assists           | goals.assists                          |
| saves             | goals.saves                            |
| shots_total       | shots.total                            |
| shots_on          | shots.on                               |
| passes_total      | passes.total                           |
| passes_key        | passes.key                             |
| passes_accuracy   | passes.accuracy                        |
| tackles           | tackles.total                          |
| blocks            | tackles.blocks                         |
| interceptions     | tackles.interceptions                  |
| duels_total       | duels.total                            |
| duels_won         | duels.won                              |
| dribbles_attempts | dribbles.attempts                      |
| dribbles_success  | dribbles.success                       |
| dribbles_past     | dribbles.past                          |
| fouls_committed   | fouls.committed                        |
| fouls_drawn       | fouls.drawn                            |
| yellow_cards      | cards.yellow                           |
| red_cards         | cards.red                              |
| penalty_won       | penalty.won                            |
| penalty_committed | penalty.commited                       |
| penalty_scored    | penalty.scored                         |
| penalty_missed    | penalty.missed                         |

**Stored as:** `data/season_stats.csv`

### 2.3 — Match stats table

One row per player per match. From `/fixtures/players` (step 1.4). 2025/26 season only.

| Column                                | Source               |
| ------------------------------------- | -------------------- |
| player_id                             | player.id            |
| fixture_id                            | from fixture context |
| date                                  | from fixtures list   |
| team                                  | team.name            |
| opponent                              | derived from fixture |
| home_away                             | derived from fixture |
| minutes                               | games.minutes        |
| rating                                | games.rating         |
| All same stat columns as season table | Same field mapping   |

**Stored as:** `data/match_stats.csv`

### 2.4 — Injury table

One row per injury/sidelined event. From `/sidelined` (step 1.5).

| Column      | Source                | Example          |
| ----------- | --------------------- | ---------------- |
| player_id   | from query param      | 1100             |
| injury_type | type                  | Hamstring Injury |
| start_date  | start                 | 2024-12-22       |
| end_date    | end                   | 2025-02-01       |
| days_out    | computed: end - start | 41               |

**Stored as:** `data/injuries.csv`

---

## Phase 3 — Feature engineering

For each player at each gameweek in the current season, compute features looking backwards.

### 3.1 — Rolling match features (from match stats table)

Computed from the per-match data for 2025/26:

- `minutes_last_7d` — total minutes in the last 7 days
- `minutes_last_14d` — total minutes in the last 14 days
- `minutes_last_30d` — total minutes in the last 30 days
- `minutes_last_60d` — total minutes in the last 60 days
- `matches_last_14d` — number of matches played in last 14 days
- `matches_last_30d` — number of matches played in last 30 days
- `days_since_last_match` — rest days
- `avg_minutes_per_match_30d` — average minutes per appearance (last 30 days)
- `workload_trend` — % change: minutes_last_30d vs minutes_previous_30d
- `duels_per_90_rolling` — duels per 90 minutes (last 5 matches)
- `tackles_per_90_rolling` — tackles per 90 (last 5 matches)
- `dribbles_per_90_rolling` — dribble attempts per 90 (last 5 matches)
- `fouls_committed_per_90_rolling` — fouls per 90 (last 5 matches)
- `rating_trend` — average rating last 5 matches vs previous 5 (declining = fatigue)
- `consecutive_90min_starts` — how many full 90-minute games in a row
- `yellow_cards_last_30d` — discipline accumulation

### 3.2 — Season comparison features (from season stats table)

Comparing current season to prior seasons:

- `minutes_vs_last_season` — ratio of current per-90 rates to previous season
- `duels_per_90_vs_last_season` — physical intensity change
- `appearances_pace` — projected total appearances based on current rate vs previous season

### 3.3 — Injury history features (from injury table)

Full career, computed from sidelined data:

- `career_total_injuries` — lifetime count
- `injuries_last_12_months` — recent injury count
- `injuries_last_24_months` — medium-term count
- `days_missed_last_12_months` — total days out recently
- `days_missed_last_24_months` — total days out medium-term
- `days_since_last_injury` — how long since last injury ended
- `is_recently_returned` — boolean: returned from injury within last 30 days
- `recurring_injury_flag` — boolean: same injury type appeared 2+ times in career
- `recurring_injury_type` — the specific type that recurs (e.g. "Hamstring Injury")
- `avg_recovery_days` — average days out per injury
- `recovery_trend` — are recovery times getting longer? (regression slope)
- `longest_injury_days` — worst single injury duration

### 3.4 — Player profile features (from players table)

Static features:

- `age` — current age
- `age_squared` — age² (injury risk is nonlinear with age)
- `position_encoded` — one-hot or label encoded (Goalkeeper, Defender, Midfielder, Attacker)
- `height` — in cm
- `weight` — in kg
- `bmi` — computed: weight / (height/100)²

### 3.5 — Target variable

For each player-gameweek row, look forward in the injury table:

`injured_next_90d` — did a new injury (not suspension) start within 90 days of this gameweek? Binary: 1 = yes, 0 = no.

**Output:** `data/ml_features.csv` — one row per player per gameweek, all features + target.

---

## Phase 4 — Model training

### 4.1 — Train/test split

```
2022/23 + 2023/24 + 2024/25     →    TRAINING SET
(season-level features +              (learn injury patterns)
 injury history features)

2025/26 GW1-25                   →    VALIDATION SET
(match-level rolling features +       (tune hyperparameters)
 injury history features)

2025/26 GW26-33                  →    TEST SET
(most recent weeks)                   (final evaluation)
```

Split is strictly temporal — no future data leaks into training.

### 4.2 — Class imbalance handling

Most player-gameweeks are "not injured" (~90-95%). Handle with:

- `scale_pos_weight` parameter in XGBoost (set to ratio of negatives/positives)
- Alternatively: SMOTE oversampling on training set only (never on validation/test)
- Evaluate with precision-recall AUC, not accuracy

### 4.3 — Model

XGBoost gradient boosted trees. Strong baseline for tabular data, handles missing values natively, gives feature importance for free.

**Hyperparameter search:**

- max_depth: [3, 5, 7]
- learning_rate: [0.01, 0.05, 0.1]
- n_estimators: [200, 500, 1000]
- min_child_weight: [1, 3, 5]
- subsample: [0.7, 0.8, 0.9]

Tuned with time-series cross-validation on training set.

### 4.4 — Evaluation metrics

- **PR-AUC** (precision-recall area under curve) — primary metric, handles imbalance
- **F1 score** at optimal threshold
- **Calibration plot** — does 30% predicted risk actually mean 30% of those players get injured?
- **Feature importance** — which features drive predictions (for the "risk factors" display)

**Output:** `models/injury_predictor.pkl` — trained model file

---

## Phase 5 — Live prediction

### 5.1 — Generate predictions for every active player

For each player currently in the 2025/26 PL season with minutes > 0:

1. Compute their current rolling features from match stats (latest gameweek)
2. Compute their injury history features from sidelined data
3. Add their profile features (age, position, height, weight)
4. Feed feature vector into trained model
5. Output: injury probability 0.0 to 1.0

### 5.2 — Extract risk factors

From XGBoost's SHAP values for each player, extract the top 3-5 features driving their risk score. Translate feature names into human-readable strings:

- `minutes_last_30d = 520` → "High workload: 520 min in last 30 days"
- `recurring_injury_flag = 1` → "Recurring hamstring injury (3× career)"
- `workload_trend = 0.22` → "Workload increased 22% vs previous month"
- `days_since_last_injury = 45` → "Recently returned from injury (45 days ago)"
- `age = 32` → "Age-related risk factor"

### 5.3 — Build player output file

Combine everything into one JSON file the frontend reads:

```json
[
  {
    "player_id": 1100,
    "name": "Bukayo Saka",
    "firstname": "Bukayo",
    "lastname": "Saka",
    "photo": "https://media.api-sports.io/football/players/1100.png",
    "team": "Arsenal",
    "team_logo": "https://media.api-sports.io/football/teams/42.png",
    "position": "Attacker",
    "age": 24,
    "height": 178,
    "weight": 72,
    "nationality": "England",

    "season_stats": {
      "appearances": 25,
      "minutes": 1735,
      "rating": 7.53,
      "goals": 6,
      "assists": 10,
      "tackles": 30,
      "interceptions": 3,
      "duels_total": 243,
      "duels_won": 120,
      "dribbles_attempts": 78,
      "dribbles_success": 41,
      "fouls_committed": 15,
      "yellow_cards": 3,
      "red_cards": 0
    },

    "injury_risk": 0.34,
    "risk_level": "Medium",
    "risk_factors": [
      "High workload: 520 min in last 30 days",
      "2 prior hamstring injuries in career",
      "Workload increased 15% vs previous month"
    ],

    "injury_history": [
      {
        "type": "Hamstring Injury",
        "start": "2024-12-22",
        "end": "2025-02-01",
        "days_out": 41
      },
      {
        "type": "Ankle Injury",
        "start": "2023-09-10",
        "end": "2023-10-15",
        "days_out": 35
      }
    ]
  }
]
```

**Output:** `output/player_predictions.json`

**Risk level thresholds:**

- Low: 0-20%
- Medium: 20-45%
- High: 45-70%
- Critical: 70-100%

---

## Phase 6 — Weekly update

Runs every gameweek after matches are completed. ~25 API calls.

### 6.1 — Fetch new match data (~10 calls)

```
GET /fixtures/players?fixture={id}  ×  10 new PL matches
```

Append to `data/match_stats.csv`.

### 6.2 — Update sidelined for newly injured (~10-15 calls)

Compare player `injured` flags from the latest `/fixtures/players` response against cached data. For any player whose status changed to injured:

```
GET /sidelined?player={id}
```

Append new records to `data/injuries.csv`.

### 6.3 — Recompute features

Recalculate rolling window features for all active players using updated match and injury data.

### 6.4 — Run predictions

Feed updated features into the trained model. Regenerate `output/player_predictions.json`.

### 6.5 — Optional: retrain periodically

Every 4-8 weeks, retrain the model incorporating new data. The more gameweeks of 25/26 data that accumulate, the stronger the rolling features become.

---

## Build order

| Step | What                          | Depends on           |
| ---- | ----------------------------- | -------------------- |
| 1    | Data collection script        | API key              |
| 2    | Data storage / CSV generation | Step 1 output        |
| 3    | Feature engineering script    | Step 2 output        |
| 4    | Model training script         | Step 3 output        |
| 5    | Prediction script             | Steps 2, 3, 4 output |
| 6    | Weekly update script          | Steps 1-5 complete   |
| 7    | Frontend integration          | Step 5 JSON output   |

---

## File structure

```
injury-predictor/
├── config.py                  # API key, constants, league ID, seasons
├── collect_data.py            # Phase 1 — API calls with caching
├── build_tables.py            # Phase 2 — raw JSON → clean CSVs
├── engineer_features.py       # Phase 3 — CSVs → ML feature matrix
├── train_model.py             # Phase 4 — feature matrix → trained model
├── predict.py                 # Phase 5 — model + current data → predictions JSON
├── weekly_update.py           # Phase 6 — incremental update pipeline
├── data/
│   ├── progress.json          # tracks completed API calls
│   ├── raw/                   # raw API responses (cached JSON)
│   ├── players.csv            # player profiles
│   ├── season_stats.csv       # season aggregated stats
│   ├── match_stats.csv        # per-match stats (25/26)
│   ├── injuries.csv           # sidelined history
│   └── ml_features.csv        # engineered feature matrix
├── models/
│   └── injury_predictor.pkl   # trained XGBoost model
└── output/
    └── player_predictions.json # final output for frontend
```
