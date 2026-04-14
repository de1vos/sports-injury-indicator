# Validation Plan — Step-by-Step Checks

After each phase, run these checks before moving on. If any check fails, fix it before proceeding.

---

## Phase 1 — Data Collection

### After Step 1.1 + 1.2 (Player season stats)

**File exists:** `data/raw/players_season_stats.json`

**Checks:**
```python
import json

with open("data/raw/players_season_stats.json") as f:
    data = json.load(f)

# 1. Should have entries for 4 seasons
seasons = set()
for entry in data:
    for stat in entry["statistics"]:
        seasons.add(stat["league"]["season"])
assert seasons == {2022, 2023, 2024, 2025}, f"Expected 4 seasons, got {seasons}"

# 2. Should have 500+ unique players per season
from collections import Counter
season_counts = Counter()
for entry in data:
    for stat in entry["statistics"]:
        season_counts[stat["league"]["season"]] += 1
for season, count in season_counts.items():
    assert count >= 400, f"Season {season} only has {count} players (expected 400+)"
print(f"Players per season: {dict(season_counts)}")

# 3. Every entry should have required profile fields
for entry in data[:10]:  # spot check first 10
    player = entry["player"]
    assert player.get("id"), "Missing player ID"
    assert player.get("name"), "Missing player name"
    assert player.get("photo"), "Missing photo URL"
    assert player.get("birth", {}).get("date"), "Missing DOB"

# 4. Stats should have numeric values (not all None)
sample = data[0]["statistics"][0]
assert sample["games"]["appearences"] is not None or sample["games"]["minutes"] is not None, \
    "Stats are all None — API may have returned empty data"

print(f"Total entries: {len(data)}")
print(f"Sample player: {data[0]['player']['name']}")
print("PASS: Player season stats look good")
```

**What you should see:**
- 1,600-2,400 total entries (400-600 players x 4 seasons)
- Each player has id, name, photo, DOB
- Stats contain real numbers (appearances, minutes, goals, etc.)

---

### After Step 1.3 (Fixtures)

**File exists:** `data/raw/fixtures_2025.json`

**Checks:**
```python
import json

with open("data/raw/fixtures_2025.json") as f:
    fixtures = json.load(f)

# 1. Should have completed matches
assert len(fixtures) >= 100, f"Only {len(fixtures)} fixtures — expected 100+ by mid-season"
assert len(fixtures) <= 380, f"{len(fixtures)} fixtures — max is 380 for a PL season"

# 2. Every fixture should have required fields
for fix in fixtures[:10]:
    assert fix["fixture"]["id"], "Missing fixture ID"
    assert fix["fixture"]["date"], "Missing date"
    assert fix["teams"]["home"]["name"], "Missing home team"
    assert fix["teams"]["away"]["name"], "Missing away team"

# 3. Should have 20 unique teams
teams = set()
for fix in fixtures:
    teams.add(fix["teams"]["home"]["name"])
    teams.add(fix["teams"]["away"]["name"])
assert len(teams) == 20, f"Expected 20 teams, got {len(teams)}: {teams}"

# 4. Fixture IDs should be unique
ids = [fix["fixture"]["id"] for fix in fixtures]
assert len(ids) == len(set(ids)), "Duplicate fixture IDs found"

print(f"Total fixtures: {len(fixtures)}")
print(f"Teams: {sorted(teams)}")
print("PASS: Fixtures look good")
```

**What you should see:**
- 100-380 completed fixtures (depends on time of season)
- Exactly 20 unique Premier League teams
- Each fixture has an ID, date, home/away teams

---

### After Step 1.4 (Per-match player stats)

**File exists:** `data/raw/match_stats_2025.json`

**Checks:**
```python
import json

with open("data/raw/match_stats_2025.json") as f:
    match_stats = json.load(f)

with open("data/raw/fixtures_2025.json") as f:
    fixtures = json.load(f)

# 1. Should have one entry per fixture
fixture_ids_collected = set(match_stats.keys()) if isinstance(match_stats, dict) else set()
fixture_ids_expected = {str(f["fixture"]["id"]) for f in fixtures}
# If stored as list, adapt accordingly
print(f"Fixtures with match stats: {len(match_stats)}")

# 2. Each fixture should have 20-30 players (both teams combined)
if isinstance(match_stats, dict):
    for fix_id, players in list(match_stats.items())[:5]:
        total_players = sum(len(team["players"]) for team in players)
        assert total_players >= 20, f"Fixture {fix_id}: only {total_players} players"
        print(f"  Fixture {fix_id}: {total_players} players")

# 3. Player stats should have minutes and rating
# (adapt path based on actual structure)

print("PASS: Match stats look good")
```

**What you should see:**
- One entry per completed fixture
- 20-30+ players per fixture (both squads)
- Each player has minutes, rating, and detailed stats

---

### After Step 1.5 (Sidelined/injury history)

**File exists:** `data/raw/sidelined.json`

**Checks:**
```python
import json

with open("data/raw/sidelined.json") as f:
    sidelined = json.load(f)

# 1. Should have entries for many players
assert len(sidelined) >= 500, f"Only {len(sidelined)} players with sidelined data"

# 2. Count players with at least one injury
players_with_injuries = {pid: records for pid, records in sidelined.items() if len(records) > 0}
print(f"Total players queried: {len(sidelined)}")
print(f"Players with injury history: {len(players_with_injuries)}")

# 3. Injury records should have type, start, end
for pid, records in list(players_with_injuries.items())[:5]:
    for rec in records:
        assert "type" in rec, f"Player {pid}: missing injury type"
        assert "start" in rec, f"Player {pid}: missing start date"
        # end can be null (ongoing)
    print(f"  Player {pid}: {len(records)} records — e.g. {records[0]['type']}")

# 4. Check for common injury types
all_types = []
for records in sidelined.values():
    for rec in records:
        all_types.append(rec.get("type", ""))
from collections import Counter
print(f"\nTop 10 injury types:")
for injury_type, count in Counter(all_types).most_common(10):
    print(f"  {injury_type}: {count}")

print("\nPASS: Sidelined data looks good")
```

**What you should see:**
- 500+ players queried
- 200-400+ players with at least one injury/sidelined record
- Common types like "Hamstring Injury", "Knee Injury", "Muscle Injury", "Suspended"
- Each record has type and start date

---

### After Step 1.7 (Progress tracking)

**File exists:** `data/progress.json`

**Check:**
```python
import json

with open("data/progress.json") as f:
    progress = json.load(f)

print(json.dumps(progress, indent=2))
# Should show all steps marked as completed
# If you re-run collect_data.py, it should skip everything and finish instantly
```

**What you should see:**
- All collection steps marked complete
- Re-running the script produces no new API calls

---

## Phase 2 — Data Storage

### After Step 2.1 (Players table)

**Files exist:** `data/players.csv`, `data/players.json`

**Checks:**
```python
import pandas as pd

players = pd.read_csv("data/players.csv")

# 1. One row per unique player
assert players["player_id"].is_unique, "Duplicate player IDs!"

# 2. Expected columns
required = ["player_id", "name", "photo", "dob", "age", "nationality",
            "height", "weight", "position", "current_team", "team_logo"]
for col in required:
    assert col in players.columns, f"Missing column: {col}"

# 3. No completely empty rows
assert players["name"].notna().all(), "Some players have no name"
assert players["player_id"].notna().all(), "Some players have no ID"

# 4. Reasonable counts
print(f"Total unique players: {len(players)}")
print(f"Teams: {players['current_team'].nunique()}")
print(f"Positions: {players['position'].value_counts().to_dict()}")
print(f"Age range: {players['age'].min()} - {players['age'].max()}")
print(f"Null counts:\n{players.isnull().sum()}")

assert len(players) >= 400, f"Only {len(players)} players — expected 400+"
assert players["current_team"].nunique() >= 18, "Too few teams"

print("\nPASS: Players table looks good")
```

**What you should see:**
- 400-700 unique players
- 20 teams (current season)
- Positions: mix of Goalkeeper, Defender, Midfielder, Attacker
- Ages roughly 16-40
- Photo URLs present for most players

---

### After Step 2.2 (Season stats table)

**File exists:** `data/season_stats.csv`

**Checks:**
```python
import pandas as pd

stats = pd.read_csv("data/season_stats.csv")

# 1. Multiple seasons
seasons = stats["season"].unique()
assert len(seasons) == 4, f"Expected 4 seasons, got {seasons}"

# 2. Expected columns
required = ["player_id", "season", "team", "appearances", "minutes",
            "goals", "assists", "tackles", "duels_total", "yellow_cards"]
for col in required:
    assert col in stats.columns, f"Missing column: {col}"

# 3. Reasonable values
print(f"Total rows: {len(stats)}")
print(f"Seasons: {sorted(seasons)}")
print(f"Players per season:")
for s in sorted(seasons):
    subset = stats[stats["season"] == s]
    print(f"  {s}: {len(subset)} players, "
          f"avg minutes: {subset['minutes'].mean():.0f}, "
          f"max minutes: {subset['minutes'].max()}")

# 4. Minutes should not exceed ~3,420 (38 games x 90 min)
assert stats["minutes"].max() <= 3500, f"Max minutes {stats['minutes'].max()} seems too high"

# 5. No negative values in key columns
for col in ["appearances", "minutes", "goals", "yellow_cards"]:
    assert (stats[col].dropna() >= 0).all(), f"Negative values in {col}"

print("\nPASS: Season stats table looks good")
```

**What you should see:**
- 1,600-2,400 rows (players x seasons)
- 4 seasons: 2022, 2023, 2024, 2025
- Minutes range 0-3,420
- Goals, assists, cards are non-negative integers

---

### After Step 2.3 (Match stats table)

**File exists:** `data/match_stats.csv`

**Checks:**
```python
import pandas as pd

match = pd.read_csv("data/match_stats.csv")

# 1. Should have many rows
print(f"Total rows: {len(match)}")
assert len(match) >= 2000, f"Only {len(match)} rows — expected 2000+"

# 2. Expected columns
required = ["player_id", "fixture_id", "date", "team", "minutes"]
for col in required:
    assert col in match.columns, f"Missing column: {col}"

# 3. Minutes per match should be 0-120 (max with extra time)
assert match["minutes"].dropna().max() <= 130, "Minutes per match > 130"

# 4. Dates should be in 2025/26 season range
match["date"] = pd.to_datetime(match["date"])
assert match["date"].min() >= pd.Timestamp("2025-08-01"), "Dates before season start"

# 5. Unique fixtures should match fixtures file count
print(f"Unique fixtures: {match['fixture_id'].nunique()}")
print(f"Unique players: {match['player_id'].nunique()}")
print(f"Date range: {match['date'].min()} to {match['date'].max()}")
print(f"Avg players per fixture: {len(match) / match['fixture_id'].nunique():.0f}")

print("\nPASS: Match stats table looks good")
```

**What you should see:**
- 2,000-10,000+ rows (depends on matches played)
- Minutes per match: 0-120
- 20-30 players per fixture
- Dates within the 2025/26 season

---

### After Step 2.4 (Injuries table)

**File exists:** `data/injuries.csv`

**Checks:**
```python
import pandas as pd

injuries = pd.read_csv("data/injuries.csv")

# 1. Expected columns
required = ["player_id", "injury_type", "start_date", "end_date", "days_out"]
for col in required:
    assert col in injuries.columns, f"Missing column: {col}"

# 2. days_out should be non-negative (or NaN for ongoing)
valid_days = injuries["days_out"].dropna()
assert (valid_days >= 0).all(), "Negative days_out values found"

# 3. Suspensions vs injuries
injury_types = injuries["injury_type"].value_counts()
print(f"Total injury records: {len(injuries)}")
print(f"Unique players with injuries: {injuries['player_id'].nunique()}")
print(f"\nTop 15 injury types:")
print(injury_types.head(15))

# 4. Date sanity
injuries["start_date"] = pd.to_datetime(injuries["start_date"])
print(f"\nDate range: {injuries['start_date'].min()} to {injuries['start_date'].max()}")
print(f"Avg days out: {valid_days.mean():.1f}")
print(f"Max days out: {valid_days.max():.0f}")

print("\nPASS: Injuries table looks good")
```

**What you should see:**
- Hundreds to thousands of injury records
- Mix of "Hamstring Injury", "Knee Injury", "Muscle Injury", "Suspended", etc.
- Days out: average ~20-40, max could be 200+ (ACL injuries)
- Records spanning many years (career history)

---

## Phase 3 — Feature Engineering

### After Step 3.1-3.4 (Full feature matrix)

**File exists:** `data/ml_features.csv`

**Checks:**
```python
import pandas as pd

features = pd.read_csv("data/ml_features.csv")

# 1. Shape check
print(f"Shape: {features.shape}")
assert features.shape[1] >= 30, f"Only {features.shape[1]} columns — expected 30+ features"

# 2. Required feature columns exist
rolling_features = ["minutes_last_7d", "minutes_last_14d", "minutes_last_30d",
                    "matches_last_14d", "days_since_last_match", "workload_trend"]
injury_features = ["career_total_injuries", "injuries_last_12_months",
                   "days_since_last_injury", "recurring_injury_flag"]
profile_features = ["age", "position_encoded", "bmi"]
target = ["injured_next_90d"]

for col in rolling_features + injury_features + profile_features + target:
    assert col in features.columns, f"Missing feature: {col}"

# 3. Target variable distribution (expect ~5-15% positive)
target_dist = features["injured_next_90d"].value_counts(normalize=True)
print(f"\nTarget distribution:")
print(target_dist)
positive_rate = target_dist.get(1, 0)
assert 0.01 <= positive_rate <= 0.30, f"Positive rate {positive_rate:.2%} seems off"

# 4. No infinite values
import numpy as np
numeric_cols = features.select_dtypes(include=[np.number]).columns
inf_counts = np.isinf(features[numeric_cols]).sum()
assert inf_counts.sum() == 0, f"Infinite values found:\n{inf_counts[inf_counts > 0]}"

# 5. Null rate should be manageable
null_pct = features.isnull().mean()
high_null = null_pct[null_pct > 0.5]
if len(high_null) > 0:
    print(f"\nWarning — high null rate columns:\n{high_null}")

# 6. Feature value sanity
print(f"\nFeature stats (sample):")
print(features[["minutes_last_30d", "career_total_injuries", "age", "bmi"]].describe())

# 7. Check no future leakage — every row's features should be computed
# from data before its gameweek date
# (manual inspection: sort by date, verify rolling windows make sense)

print("\nPASS: Feature matrix looks good")
```

**What you should see:**
- 30+ feature columns
- Target variable ~5-15% positive (injured)
- No infinite values
- Minutes, age, BMI in reasonable ranges
- Each row represents one player at one gameweek

---

## Phase 4 — Model Training

### After Step 4.1-4.4 (Trained model)

**File exists:** `models/injury_predictor.pkl`

**Checks:**
```python
import pickle
import pandas as pd
import numpy as np

# 1. Model loads correctly
with open("models/injury_predictor.pkl", "rb") as f:
    model = pickle.load(f)
print(f"Model type: {type(model).__name__}")

# 2. Model can predict
features = pd.read_csv("data/ml_features.csv")
feature_cols = [c for c in features.columns if c not in
                ["player_id", "injured_next_90d", "date", "gameweek", "name"]]
X_sample = features[feature_cols].head(10)
predictions = model.predict_proba(X_sample)[:, 1]
print(f"Sample predictions: {predictions}")

# 3. Predictions are probabilities (0-1)
assert (predictions >= 0).all() and (predictions <= 1).all(), \
    "Predictions outside 0-1 range"

# 4. Predictions shouldn't all be the same
assert len(set(predictions.round(4))) > 1, "All predictions identical — model not learning"

# 5. Feature importance available
importance = model.feature_importances_
top_features = sorted(zip(feature_cols, importance), key=lambda x: -x[1])[:10]
print(f"\nTop 10 features:")
for name, imp in top_features:
    print(f"  {name}: {imp:.4f}")

# 6. Evaluation metrics (run on test set)
from sklearn.metrics import precision_recall_curve, auc, f1_score, classification_report

# Use the test portion (last gameweeks)
# Adapt this split to match your actual train/test split
test_mask = features["season"] == 2025  # or however you split
if test_mask.sum() > 0:
    X_test = features.loc[test_mask, feature_cols]
    y_test = features.loc[test_mask, "injured_next_90d"]
    y_pred_proba = model.predict_proba(X_test)[:, 1]

    precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
    pr_auc = auc(recall, precision)
    print(f"\nPR-AUC: {pr_auc:.4f}")
    assert pr_auc > 0.05, f"PR-AUC {pr_auc:.4f} is very low — model may not be learning"

    # Check calibration (rough)
    for threshold in [0.1, 0.2, 0.3, 0.5]:
        mask = y_pred_proba >= threshold
        if mask.sum() > 0:
            actual_rate = y_test[mask].mean()
            print(f"  Players predicted >= {threshold:.0%} risk: "
                  f"{mask.sum()} players, actual injury rate: {actual_rate:.1%}")

print("\nPASS: Model looks good")
```

**What you should see:**
- XGBoost model loads and predicts
- Probabilities between 0 and 1, not all identical
- PR-AUC > 0.05 (ideally > 0.15 for a useful model)
- Top features should be intuitive (injury history, workload, age)
- Higher predicted risk correlates with higher actual injury rate

---

## Phase 5 — Live Prediction

### After Step 5.1-5.3 (Prediction output)

**File exists:** `output/player_predictions.json`

**Checks:**
```python
import json

with open("output/player_predictions.json") as f:
    predictions = json.load(f)

# 1. Should have 400+ active players
print(f"Total players: {len(predictions)}")
assert len(predictions) >= 300, f"Only {len(predictions)} players — expected 300+"

# 2. Every player has required fields
required_fields = ["player_id", "name", "photo", "team", "team_logo", "position",
                   "age", "injury_risk", "risk_level", "risk_factors",
                   "season_stats", "injury_history"]
for player in predictions[:20]:
    for field in required_fields:
        assert field in player, f"Player {player.get('name', '?')}: missing {field}"

# 3. Risk values are valid
for player in predictions:
    risk = player["injury_risk"]
    assert 0.0 <= risk <= 1.0, f"{player['name']}: risk {risk} out of range"
    level = player["risk_level"]
    assert level in ["Low", "Medium", "High", "Critical"], \
        f"{player['name']}: invalid risk level '{level}'"

# 4. Risk level matches thresholds
for player in predictions:
    risk = player["injury_risk"]
    level = player["risk_level"]
    if risk <= 0.20:
        assert level == "Low", f"{player['name']}: {risk} should be Low, got {level}"
    elif risk <= 0.45:
        assert level == "Medium"
    elif risk <= 0.70:
        assert level == "High"
    else:
        assert level == "Critical"

# 5. Risk factors are human-readable strings
for player in predictions[:10]:
    factors = player["risk_factors"]
    assert isinstance(factors, list), "risk_factors should be a list"
    assert len(factors) >= 1, f"{player['name']}: no risk factors"
    for f in factors:
        assert isinstance(f, str) and len(f) > 5, f"Bad risk factor: {f}"

# 6. Distribution of risk levels
from collections import Counter
level_dist = Counter(p["risk_level"] for p in predictions)
print(f"\nRisk distribution:")
for level in ["Low", "Medium", "High", "Critical"]:
    print(f"  {level}: {level_dist.get(level, 0)}")

# 7. Spot check a few well-known players
known_teams = {"Arsenal", "Manchester City", "Liverpool", "Chelsea",
               "Manchester United", "Tottenham"}
teams_found = set(p["team"] for p in predictions)
missing_big_teams = known_teams - teams_found
assert len(missing_big_teams) == 0, f"Missing teams: {missing_big_teams}"

# 8. Season stats present and reasonable
for player in predictions[:5]:
    ss = player["season_stats"]
    print(f"\n{player['name']} ({player['team']})")
    print(f"  Risk: {player['injury_risk']:.0%} ({player['risk_level']})")
    print(f"  Appearances: {ss.get('appearances')}, Minutes: {ss.get('minutes')}")
    print(f"  Risk factors: {player['risk_factors']}")
    print(f"  Injuries: {len(player['injury_history'])} career records")

print("\nPASS: Prediction output looks good")
```

**What you should see:**
- 300-600 players with predictions
- Risk distribution: mostly Low/Medium, some High, few Critical
- All 20 PL teams represented
- Risk factors are readable sentences
- Photo URLs, team logos present
- Season stats have real numbers

---

## Phase 6 — Weekly Update

_To be added after Phases 1-5 are validated and working._

---

## Quick Reference — Expected File Sizes

| File | Expected Size | Rows |
|------|--------------|------|
| `data/raw/players_season_stats.json` | 5-15 MB | — |
| `data/raw/fixtures_2025.json` | 200-500 KB | — |
| `data/raw/match_stats_2025.json` | 10-30 MB | — |
| `data/raw/sidelined.json` | 2-8 MB | — |
| `data/players.csv` | 100-200 KB | 400-700 |
| `data/season_stats.csv` | 200-500 KB | 1,600-2,400 |
| `data/match_stats.csv` | 500 KB-2 MB | 2,000-10,000 |
| `data/injuries.csv` | 100-500 KB | 500-5,000 |
| `data/ml_features.csv` | 500 KB-3 MB | 2,000-10,000 |
| `models/injury_predictor.pkl` | 100 KB-5 MB | — |
| `output/player_predictions.json` | 500 KB-2 MB | 300-600 |
