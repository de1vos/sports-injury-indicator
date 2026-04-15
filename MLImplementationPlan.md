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

### Step 1.5 — Squad data (kit numbers)

**Endpoint:** `GET /players/squads?team={id}`

**Purpose:** Get kit/jersey number for every player in each current PL squad.

**Returns per player:** id, name, age, number (jersey), position, photo.

**Calls:** 20 teams × 1 call each = **~20 calls**

**Output:** `data/raw/squads.json` — keyed by team ID, each containing player list with jersey numbers.


### Step 1.6 — Upcoming fixtures

**Endpoint:** `GET /fixtures?league=39&season=2025&status=NS-1H-2H-HT`

**Purpose:** Get all scheduled/not-yet-completed fixtures for the current season. Provides next match info and match density calculations. Also fetches recently completed fixtures for the "important past matches" display.

**Returns per fixture:** fixture ID, date, timestamp, home team (id, name), away team (id, name), venue, round.

**Calls:** **~2 calls**

**Output:** `data/raw/fixtures_upcoming.json`


### Step 1.7 — Injury and sidelined history

**Endpoint:** `GET /sidelined?player={id}`

**Purpose:** Full career injury and suspension timeline for every player. One call per unique player ID returns their entire history — not limited to the 4 seasons. Note: this endpoint lags behind for recent seasons (typically complete up to ~2 months ago). Supplemented by Step 1.8.

**Returns per record:**

- type: specific injury name (e.g. "Hamstring Injury", "ACL Rupture", "Knee Surgery", "Suspended")
- start: date string (YYYY-MM-DD)
- end: date string (YYYY-MM-DD) or null if ongoing

**Calls:** ~1,200 unique player IDs across all 4 seasons = **~1,200 calls**

**Output:** `data/sidelined.json` — keyed by player ID, each containing an array of injury records.

### Step 1.8 — Season injury reports (per-fixture)

**Endpoint:** `GET /injuries?league=39&season={year}`

**Seasons:** 2022, 2023, 2024, 2025

**Purpose:** Pre-match injury reports per fixture showing which players were unavailable and why. More up-to-date than the sidelined endpoint, especially for the current season. Returns all PL injury reports for a full season in a single call — no pagination.

**Calls:** 1 per season × 4 seasons = **4 calls**

**Output:** `data/raw/injuries_season_{year}.json`

### Step 1.9 — Total call budget

| Step      | Endpoint                              | Calls      |
| --------- | ------------------------------------- | ---------- |
| 1.1       | `/players` (22/23, 23/24, 24/25)      | ~120       |
| 1.2       | `/players` (25/26)                    | ~40        |
| 1.3       | `/fixtures` (25/26 completed)         | ~6         |
| 1.4       | `/fixtures/players` (25/26 per-match) | ~330       |
| 1.5       | `/players/squads` (kit numbers)       | ~20        |
| 1.6       | `/fixtures` (25/26 upcoming)          | ~2         |
| 1.7       | `/sidelined` (all unique players)     | ~1,200     |
| 1.8       | `/injuries` (4 seasons)               | ~4         |
| **Total** |                                       | **~1,722** |

Pro plan: 7,500 calls/day. Entire collection runs in **under 6 hours** with rate limiting (0.5s between calls).

### Step 1.10 — Caching and resume

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
| kit_number   | `/players/squads` → number | 7                               |

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

One row per injury/sidelined event. Built from two sources:

**Source 1 — sidelined.json:** Exact start/end dates, complete career history. Lags ~2 months on current season.

**Source 2 — injuries_season_{year}.json:** Per-fixture absence reports clustered into injury events. Consecutive "Missing Fixture" entries within 45 days = one injury event. First fixture date = start_date, last fixture date + 14 days = approximate end_date. Fills the gap left by sidelined for recent months.

Duplicates removed: season_injuries rows within 30 days of the same type as a sidelined row are dropped.

| Column      | Source                                     | Example          |
| ----------- | ------------------------------------------ | ---------------- |
| player_id   | from query param                           | 1100             |
| injury_type | type                                       | Hamstring Injury |
| start_date  | start                                      | 2024-12-22       |
| end_date    | end                                        | 2025-02-01       |
| days_out    | computed: end - start                      | 41               |
| severity    | computed from days_out (see mapping below) | Moderate         |
| body_region | mapped from injury_type (see mapping below)| Thigh            |

**Severity mapping** (based on days out):
- Minor: 1-7 days
- Moderate: 8-28 days
- Severe: 29-90 days
- Long-term: 90+ days

**Body region mapping** (parsed from injury type string):
- "Hamstring" → Thigh
- "ACL", "Knee", "Meniscus" → Knee
- "Ankle" → Ankle
- "Groin", "Adductor" → Groin
- "Calf" → Calf
- "Back", "Spine" → Back
- "Shoulder" → Shoulder
- "Head", "Concussion" → Head
- "Muscle" → Muscle (general)
- "Illness", "Virus", "Covid" → Illness
- "Suspended" → Disciplinary
- Other → Other

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
- `acute_chronic_ratio` — minutes last 7 days / avg weekly minutes over last 28 days (ACWR). Values > 1.5 = spike risk
- `match_density_14d` — number of team fixtures (played or scheduled) in a 14-day window
- `fouls_against_per_90_rolling` — fouls drawn per 90 (last 5 matches), proxy for physical targeting

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
- `matches_missed_career` — estimated career matches missed (sum of days_out / 7, capped at team fixture rate)
- `matches_missed_this_season` — matches missed this season due to injury
- `minutes_missed_this_season` — estimated minutes missed (matches_missed × 90)
- `injuries_this_season` — count of new injuries in current season

### 3.4 — Player profile features (from players table)

Static features:

- `age` — current age
- `age_squared` — age² (injury risk is nonlinear with age)
- `position_encoded` — one-hot or label encoded (Goalkeeper, Defender, Midfielder, Attacker)
- `height` — in cm
- `weight` — in kg

### 3.5 — Target variable

For each player-gameweek row, look forward in the injury table:

`injured_next_90d` — did a new injury (not suspension) start within 90 days of this gameweek? Binary: 1 = yes, 0 = no.

Rows where the 90-day forward window hasn't closed yet (based on max injury date in injuries.csv) are dropped to avoid false negatives.

**Output:** `data/ml_features.csv` — one row per player per gameweek, all features + target.

---

## Phase 4 — Model training

### 4.1 — Train/test split

```
2022/23 + 2023/24 + 2024/25     →    TRAINING SET
(season-level features +              (learn injury patterns)
 injury history features)

2025/26 GW1-50%                  →    VALIDATION SET
(match-level rolling features +       (tune threshold + calibration)
 injury history features)

2025/26 GW50%+                   →    TEST SET
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

### 4.4 — Calibration

XGBoost trained on 3 complete retrospective seasons produces over-inflated raw probabilities (~40% base rate vs ~30% in the live season). Isotonic regression calibration is fitted on the validation set. Maps raw scores to realistic probabilities matching the current-season distribution while preserving player risk rankings.

### 4.5 — Evaluation metrics

- **PR-AUC** (precision-recall area under curve) — primary metric, handles imbalance
- **F1 score** at optimal threshold
- **Calibration plot** — does 30% predicted risk actually mean 30% of those players get injured?
- **Feature importance** — which features drive predictions (for the "risk factors" display)

**Output:** `models/injury_predictor.pkl` — trained model file

---

## Phase 5 — Live prediction

### 5.1 — Overview

Single script: `ml/predict_players.py`

Reads all local data (no API calls except one to refresh upcoming fixtures), runs the calibrated model on every active 2025/26 player, and writes two JSON files the frontend reads directly.

**Active players:** Anyone with at least one `season=2025` row in `match_stats.csv`.

### 5.2 — Current risk score

For each player, take their **most recent match row** from `ml_features.csv` (highest date where `season=2025`). Feed its 46 features into the calibrated model → `injury_risk` float (0.0–1.0).

### 5.3 — Risk trend (last 12 matches)

Slice the **last 12 match rows** per player from `ml_features.csv` ordered by date. Run the model on each row. Result: a 12-point array showing how the player's risk has evolved match-by-match across the season.

```
Match 1 (Aug 17)  →  features at that date  →  0.22
Match 2 (Aug 24)  →  features at that date  →  0.25
...
Match 12 (Dec 10) →  features at that date  →  0.34
```

Each value answers: *"what was this player's injury risk going into that match?"* If workload has been building you see a steady climb. If they just returned from injury you see a spike then gradual fall.

### 5.4 — Risk factors (SHAP)

SHAP (SHapley Additive exPlanations) explains each individual prediction by computing how much each feature pushed the risk up or down from the average player baseline.

Example for a player at 34% risk:
```
Baseline (average player):          15%
+ injuries_last_24_months = 4:      +9%
+ matches_last_30d = 6:             +6%
+ days_since_last_injury = 12:      +5%
- age = 23 (young):                 -2%
─────────────────────────────────────────
Final:                              34%
```

The top 3 positive SHAP features are translated into human-readable strings:

| Feature | Value | Output string |
|---------|-------|---------------|
| `injuries_last_24_months` | 4 | "4 injuries in last 24 months" |
| `matches_last_30d` | 6 | "High match load: 6 games in last 30 days" |
| `minutes_last_30d` | 520 | "High workload: 520 min in last 30 days" |
| `acute_chronic_ratio` | 1.4 | "Workload spike: ACWR 1.40" |
| `days_since_last_injury` | 12 | "Recently returned from injury (12 days ago)" |
| `consecutive_90min_starts` | 5 | "5 consecutive 90-min starts" |
| `recurring_injury_flag` | 1 | "History of recurring {recurring_injury_type}" |
| `workload_trend` | 0.22 | "Workload up 22% vs previous month" |
| `age` | 33 | "Age-related risk (33 years old)" |

### 5.5 — Season stats

**Current season (`season_stats`):** from `season_stats.csv` where `season=2025`.

**Previous season (`previous_season_stats`):** from `season_stats.csv` where `season=2024`. Allows the frontend to show year-over-year comparison. `null` if the player wasn't in the PL last season.

### 5.6 — Matches output

**Source:** `fixtures_2025.json` (completed) + `fixtures_upcoming.json` (upcoming).
**Refresh upcoming:** one API call to `GET /fixtures?league=39&season=2025&status=NS` before generating output.

**Completed:** all fixtures with `date >= today - 14 days`
**Upcoming:** all fixtures with `date <= today + 14 days`

### 5.7 — Output format

#### `output/predictions.json`

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
    "kit_number": 7,

    "injury_risk": 0.34,
    "risk_level": "Medium",
    "risk_factors": [
      "4 injuries in last 24 months",
      "High workload: 520 min in last 30 days",
      "Workload up 15% vs previous month"
    ],
    "injury_risk_trend": [0.22, 0.25, 0.28, 0.27, 0.30, 0.29, 0.31, 0.30, 0.33, 0.32, 0.34, 0.34],

    "season_stats": {
      "appearances": 25, "minutes": 1735, "rating": 7.53,
      "goals": 6, "assists": 10, "tackles": 30, "interceptions": 3,
      "duels_total": 243, "duels_won": 120,
      "dribbles_attempts": 78, "dribbles_success": 41,
      "fouls_committed": 15, "fouls_drawn": 32,
      "yellow_cards": 3, "red_cards": 0
    },

    "previous_season_stats": {
      "appearances": 35, "minutes": 2890, "rating": 7.71,
      "goals": 16, "assists": 9, "tackles": 42, "interceptions": 5,
      "duels_total": 310, "duels_won": 158,
      "dribbles_attempts": 102, "dribbles_success": 54,
      "fouls_committed": 22, "fouls_drawn": 45,
      "yellow_cards": 2, "red_cards": 0
    },

    "workload": {
      "minutes_last_30d": 520,
      "matches_last_30d": 6,
      "acute_chronic_ratio": 1.35,
      "match_density_14d": 4,
      "fouls_against_per_90": 2.1,
      "consecutive_90min_starts": 3
    },

    "injury_summary": {
      "career_total_injuries": 5,
      "injuries_this_season": 1,
      "days_since_last_injury": 72,
      "matches_missed_this_season": 6,
      "minutes_missed_this_season": 540,
      "matches_missed_career": 28
    },

    "injury_history": [
      {
        "type": "Hamstring Injury",
        "start": "2024-12-22",
        "end": "2025-02-01",
        "days_out": 41,
        "severity": "Severe",
        "body_region": "Thigh"
      }
    ],

    "next_match": {
      "fixture_id": 99887,
      "date": "2026-04-19T15:00:00+00:00",
      "home_team": "Arsenal",
      "away_team": "Chelsea",
      "venue": "Emirates Stadium",
      "round": "Regular Season - 34"
    }
  }
]
```

#### `output/matches.json`

```json
{
  "completed": [
    {
      "fixture_id": 99801,
      "date": "2026-04-12T15:00:00+00:00",
      "round": "Regular Season - 33",
      "home_team": { "name": "Arsenal", "logo": "..." },
      "away_team": { "name": "Liverpool", "logo": "..." },
      "score": { "home": 2, "away": 1 },
      "venue": "Emirates Stadium"
    }
  ],
  "upcoming": [
    {
      "fixture_id": 99887,
      "date": "2026-04-19T15:00:00+00:00",
      "round": "Regular Season - 34",
      "home_team": { "name": "Arsenal", "logo": "..." },
      "away_team": { "name": "Chelsea", "logo": "..." },
      "venue": "Emirates Stadium"
    }
  ]
}
```

### 5.8 — Risk level thresholds

| Level | Range |
|-------|-------|
| Low | 0–20% |
| Medium | 20–45% |
| High | 45–70% |
| Critical | 70–100% |

### 5.9 — Not available from API-Football

The following frontend requests **cannot** be fulfilled by API-Football and are excluded:

- **Market value** — requires Transfermarkt (separate data source, not in API-Football)
- **Contract end date** — not returned by any API-Football endpoint
- **Preferred foot** — not returned by any API-Football endpoint

### 5.10 — API calls for Phase 5

| Action | Calls |
|--------|-------|
| Refresh upcoming fixtures | 1 |
| Everything else | 0 (local) |

---

## Phase 6 — Weekly update

Runs every gameweek after matches are completed. ~15 API calls.

### 6.1 — Fetch new match data (~10 calls)

```
GET /fixtures/players?fixture={id}  ×  10 new PL matches
```

Append to `data/match_stats.csv`.

### 6.2 — Refresh season injury reports (4 calls)

```
GET /injuries?league=39&season=2025
```

Re-fetch to pick up newly reported injuries. Much cheaper than re-fetching sidelined (~1,781 calls).

### 6.3 — Refresh upcoming fixtures (1 call)

```
GET /fixtures?league=39&season=2025&status=NS
```

### 6.4 — Recompute features + predictions

```
make refeature && make predict
```

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
├── .env                       # API key (gitignored)
├── ml/
│   ├── config.py
│   ├── Makefile
│   ├── collect_players.py
│   ├── collect_fixtures.py
│   ├── collect_fixtures_historical.py
│   ├── collect_fixtures_upcoming.py
│   ├── collect_match_stats.py
│   ├── collect_match_stats_historical.py
│   ├── collect_squads.py
│   ├── collect_sidelined.py
│   ├── collect_injuries_season.py
│   ├── build_players.py
│   ├── build_season_stats.py
│   ├── build_match_stats.py
│   ├── build_injuries.py
│   ├── engineer_rolling_features.py
│   ├── engineer_season_features.py
│   ├── engineer_injury_features.py
│   ├── engineer_profile_features.py
│   ├── engineer_target.py
│   ├── train_model.py
│   └── predict_players.py          ← Phase 5 (to be written)
├── data/
│   ├── progress.json
│   ├── raw/
│   │   ├── players_season_stats.json
│   │   ├── fixtures_2025.json
│   │   ├── fixtures_{2022,2023,2024}.json
│   │   ├── fixtures_upcoming.json
│   │   ├── match_stats_{2022,2023,2024,2025}.json
│   │   ├── squads.json
│   │   ├── sidelined.json
│   │   └── injuries_season_{2022,2023,2024,2025}.json
│   ├── players.csv
│   ├── season_stats.csv
│   ├── match_stats.csv
│   ├── injuries.csv
│   └── ml_features.csv
├── models/
│   ├── injury_predictor.pkl
│   └── feature_importance.csv
└── output/
    ├── predictions.json            ← consumed by frontend
    └── matches.json                ← consumed by frontend
```
