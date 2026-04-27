# Plan: Fix 1 (Positive Rate) + Fix 2 (Injury-Type Features)

## Fix 1 — Train on PL fixtures only (not cup/Euro rows)

### The problem
After adding cup/Euro matches, rolling_features.csv has a row for every match a PL player played — including UCL, FA Cup, EFL Cup, etc. When engineer_target.py computes the target label, it does so for every row. So if a player got injured in December, they now have 5 rows in November–December that all get `injured_next_90d = 1` (Saturday PL + Tuesday UCL + Saturday PL + Wednesday FA Cup + Saturday PL). Before adding cups they'd have 3. This inflates the positive rate from ~20% to 35%+ and means the model trains on cup-match rows — but we only ever make predictions before **PL matches** in production.

The fix preserves the cup/Euro benefit (richer rolling workload features) while correcting the label distribution:
- **Keep** all matches in rolling_features.csv — so minutes/density/ACWR features are enriched
- **Filter** to PL fixtures only before computing targets — so training rows = PL matches only

### File to modify: `ml/engineer_target.py`

After the existing PL player filter, add a PL fixture filter:

```python
# ── Filter to PL fixtures only ────────────────────────────────────────────────
# We want to predict injury risk before PL matches, not cup/Euro matches.
# Cup/Euro rows still enriched the rolling features above, but we don't
# train or make predictions at cup fixture dates.
if "competition" in matches.columns:
    pl_fixture_ids = set(
        matches[matches["competition"] == "PL"]["fixture_id"].unique()
    )
    before_pl = len(rolling)
    rolling = rolling[rolling["fixture_id"].isin(pl_fixture_ids)].copy()
    print(f"  PL fixture filter: {before_pl} → {len(rolling)} rows "
          f"({before_pl - len(rolling)} cup/Euro rows removed)")
else:
    print("  Warning: no competition column — skipping PL fixture filter.")
```

This goes immediately **after** the existing PL player filter block and **before** the target computation loop.

### Expected outcome
- Rows drop from ~77k to ~58k (back to roughly PL-match count)
- Target positive rate drops from ~36% back toward ~20–22%
- Training examples now match the production scenario (predict before a PL match)
- No changes needed to feature engineering scripts or train_model.py

---

## Fix 2 — Body-region injury-type features

### The problem
`injuries_last_24_months` is the top feature but treats all injuries identically. A player with two hamstring tears is fundamentally different from one with two minor ankle sprains — hamstrings have 3× the recurrence rate of other soft-tissue injuries. The model has no way to distinguish them.

We already have:
- `injuries.csv` with raw injury type strings (e.g. "Hamstring", "ACL", "Ankle Sprain")
- `BODY_REGION_MAP` in config.py mapping substrings → body regions (Thigh, Knee, Ankle, etc.)
- `recurring_injury_type` string column (already excluded from features — too many categories)

### Features to add (6 new columns in injury_features.csv)

| Feature | Description |
|---|---|
| `muscle_injuries_last_24m` | Hamstring + quad + calf + adductor injuries in last 24 months — the highest-recurrence group |
| `knee_injuries_last_24m` | ACL + knee + meniscus — long recovery, high recurrence |
| `ankle_injuries_last_24m` | Ankle injuries — common, moderate recurrence |
| `days_since_last_muscle_injury` | Recency of last soft-tissue/muscle injury (None if never) |
| `days_since_last_knee_injury` | Recency of last knee injury (None if never) |
| `same_region_recurrence_flag` | 1 if player had 2+ injuries to the same body region in last 24m |

These 6 features replace the crude `recurring_injury_flag` + `recurring_injury_type` string with quantitative per-region signal.

### File to modify: `ml/engineer_injury_features.py`

#### Step A — import BODY_REGION_MAP from config

```python
from config import INJURIES_CSV, MATCH_STATS_CSV, DATA_DIR, BODY_REGION_MAP
```

#### Step B — add a helper to map injury type → body region

```python
def get_body_region(injury_type: str) -> str | None:
    """Map a raw injury type string to a body region using BODY_REGION_MAP."""
    if not injury_type or pd.isna(injury_type):
        return None
    lower = str(injury_type).lower()
    for keyword, region in BODY_REGION_MAP.items():
        if keyword in lower:
            return region
    return "Other"
```

#### Step C — add body region column before computing features

In `main()`, after loading injuries.csv, add a `body_region` column:

```python
injuries["body_region"] = injuries["injury_type"].apply(get_body_region)
```

#### Step D — extend `compute_injury_features()` to return the new features

Inside the function, after computing `last_24m`:

```python
# ── Body-region injury counts ──────────────────────────────────────────────
MUSCLE_REGIONS = {"Thigh", "Calf", "Groin"}  # hamstring, quad, calf, adductor
KNEE_REGIONS   = {"Knee"}
ANKLE_REGIONS  = {"Ankle"}

if "body_region" in past.columns:
    last_24m_regions = last_24m["body_region"]
    muscle_24m = int(last_24m_regions.isin(MUSCLE_REGIONS).sum())
    knee_24m   = int(last_24m_regions.isin(KNEE_REGIONS).sum())
    ankle_24m  = int(last_24m_regions.isin(ANKLE_REGIONS).sum())

    # Days since last muscle / knee injury
    muscle_past = past[past["body_region"].isin(MUSCLE_REGIONS) & past["end_date"].notna() & (past["end_date"] < ref_date)]
    knee_past   = past[past["body_region"].isin(KNEE_REGIONS)   & past["end_date"].notna() & (past["end_date"] < ref_date)]

    days_since_muscle = int((ref_date - muscle_past["end_date"].max()).days) if not muscle_past.empty else None
    days_since_knee   = int((ref_date - knee_past["end_date"].max()).days)   if not knee_past.empty   else None

    # Same region recurrence: 2+ injuries to same region in last 24m
    region_counts = last_24m_regions.value_counts()
    same_region_recurrence = int((region_counts >= 2).any())
else:
    muscle_24m = knee_24m = ankle_24m = 0
    days_since_muscle = days_since_knee = None
    same_region_recurrence = 0
```

Add to the return dict:

```python
"muscle_injuries_last_24m":    muscle_24m,
"knee_injuries_last_24m":      knee_24m,
"ankle_injuries_last_24m":     ankle_24m,
"days_since_last_muscle_injury": days_since_muscle,
"days_since_last_knee_injury":   days_since_knee,
"same_region_recurrence_flag":   same_region_recurrence,
```

Also update the empty-player return dict with the same 6 keys (all 0 / None).

#### Step E — remove `recurring_injury_type` from NON_FEATURE_COLS in `train_model.py`

`recurring_injury_type` is already excluded because it's a string. Leave that. The new 6 features are all int/float and will be picked up automatically.

---

## Commands to run after both fixes

```bash
# Fix 1 only changes engineer_target.py — no need to re-run rolling/injury features
python3.14 engineer_target.py

# Fix 2 requires re-running injury features, then re-joining in engineer_target.py
python3.14 engineer_injury_features.py
python3.14 engineer_target.py

# Then retrain
python3.14 train_model.py
python3.14 predict_players.py
```

Or via Makefile:
```bash
make refeature   # runs all engineer_*.py + train_model.py
make predict
```

---

## Expected outcome

| Metric | Current | Expected after fixes |
|---|---|---|
| Target positive rate | ~36% | ~20–22% |
| Training rows | ~60k | ~42k (PL matches only) |
| Top features | injuries_last_24m (generic) | muscle_injuries_24m, knee_injuries_24m alongside it |
| PR-AUC (test) | 0.487 | 0.50–0.52 (estimate) |
| Train/test gap | 0.244 | 0.20–0.22 (estimate) |

The positive rate fix is the most important — it corrects a structural mismatch between training and production. The injury-type features add genuine medical signal on top.
