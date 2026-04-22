# Suggested Improvements

Current state: PR-AUC (test) = 0.485, train/test gap = 0.254

---

## Reducing the train/test gap

The gap (train 0.739, test 0.485) has three root causes:
1. **Era-specific patterns** — refereeing style, tactical trends, and injury medicine shift year to year. `fouls_committed_per_90` being the #2 feature is a warning sign — foul rates are era-dependent, not biologically stable.
2. **Correlated features** — `injuries_last_12m`, `injuries_last_24m`, `career_total_injuries`, `days_missed_last_12m`, `days_missed_last_24m` all measure the same thing from different angles. More features = more ways to overfit.
3. **Flat sample weights** — a 2022 row is treated identically to a 2024 row, even though 2024 patterns are far more predictive of 2025 outcomes.

### Fix 1 — Recency weighting (highest impact, low effort)
Give more weight to recent training examples. XGBoost accepts `sample_weight`. A row from 2022 gets weight 0.5, 2023 gets 0.75, 2024 gets 1.0. The model optimises primarily for patterns that hold in 2024 — the year closest to the test period.

```python
# In train_model.py — pass to model.fit()
weights = train_df["date"].dt.year.map({2022: 0.5, 2023: 0.75, 2024: 1.0}).fillna(1.0)
model.fit(X_train, y_train, sample_weight=weights)
```

### Fix 2 — Feature pruning (high impact, low effort)
We have 55 features. The bottom 30 by importance collectively contribute ~15% of signal but 100% of their noise. Drop everything below 0.01 importance. Target ~25 features. Simpler models generalise better.

File to change: `train_model.py` — filter `feature_cols` by importance threshold after a first-pass fit, then refit on the pruned set.

### Fix 3 — Tighter regularisation (medium impact, low effort)
Already reduced `max_depth` 5→3 and `min_child_weight` 3→5. Go further:
- `max_depth = 2`
- `min_child_weight = 10`
- `reg_alpha = 0.5` (L1 — pushes weak feature weights to zero)

### Fix 4 — Time-series cross-validation (medium impact, medium effort)
Instead of one train/val/test split, use 3 rolling folds:

| Fold | Train | Test |
|---|---|---|
| 1 | 2022 | 2023 |
| 2 | 2022–2023 | 2024 |
| 3 | 2022–2024 | 2025 |

Average PR-AUC across folds. Finds hyperparameters that work across multiple eras rather than just one val set. Currently tuning on a single val window (Apr–Dec 2024) is itself a form of overfitting.

### Fix 5 — Shorter prediction window (medium impact, reframes the problem)
90 days is a long window — a lot can happen. A **45-day window** reduces label noise at the boundaries and makes the target more precisely predictable. Downside: shorter warning window in the app.

File to change: `LOOKAHEAD_DAYS = 90` in `engineer_target.py`.

### Fix 6 — Drop era-unstable features (lower impact, requires judgement)
`fouls_committed_per_90_rolling` and `yellow_cards_last_30d` vary with referee culture and tactical trends — not biology. Replacing them with more stable features (injury history, age, position, workload) should improve generalisation.

---

## More data

### Priority 1 — `/fixtures/events` (high value, ~1,500 calls)
Catches players substituted off mid-match due to injury — ground-truth in-match injury events that the current `/injuries` endpoint misses. Improves label accuracy (fewer false negatives near match dates).

Endpoint: `GET /fixtures/events?fixture={id}` — filter `type=subst` + reason containing "injury".

### Priority 2 — Actual international match minutes (high value, ~2,400 calls)
Currently uses a hardcoded break-calendar flag (`in_intl_break_window`, `days_since_intl_break`). Actual international minutes per player would replace 3 weak features with 1 strong one: `intl_minutes_last_30d`.

Endpoint: `GET /players?id={player_id}&season={yr}` — already called for season stats, just extract national team minutes.

### Priority 3 — `/fixtures/lineups` (medium value, ~1,500 calls)
Distinguishes "benched for rest" vs "absent injured". A player named in the squad but not starting is different from one not named at all. Adds a `squad_status` feature.

### Priority 4 — Historical PL backfill 2018–2021 (modest value, ~4,000 calls)
More training rows of the same PL distribution. Diminishing returns — overfitting gap is not primarily a data-volume problem at this stage, but more historical data would help time-series CV.

---

## Model architecture

### Try LightGBM
Drop-in replacement for XGBoost. Often generalises better on tabular data with many nulls (which we have — `duels_per_90_vs_last_season` is null for 37k rows). LightGBM handles nulls natively and its leaf-wise tree growth tends to produce lower-variance models on injury-type datasets.

```python
from lightgbm import LGBMClassifier
model = LGBMClassifier(
    n_estimators=300,
    max_depth=4,
    learning_rate=0.05,
    min_child_samples=20,
    scale_pos_weight=scale_pos_weight,
    random_state=42,
)
```

### Ensemble XGBoost + Logistic Regression
Blend predictions from XGBoost (high capacity) and a simple Logistic Regression (low variance). The ensemble typically sits between the two — lower train performance but smaller gap. Weight: 0.7 XGBoost + 0.3 LR.

---

## Recommended order

1. Recency weighting — one line, likely closes gap by 0.03–0.05
2. Feature pruning — drop bottom 30 features, retrain
3. Tighter regularisation — grid search `max_depth ∈ {2,3}`, `reg_alpha ∈ {0, 0.5, 1}`
4. Time-series CV — validate all of the above properly
5. `/fixtures/events` — improve label accuracy
6. LightGBM — compare against tuned XGBoost
