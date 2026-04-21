# Plan: Cup + European Match Stats Ingestion

## Goal
Add FA Cup, EFL Cup, UCL, UEL, and UECL match stats for PL players across 2022–2025 so that rolling features (`minutes_last_7d`, `acute_chronic_ratio`, `match_density_14d`, etc.) reflect real fixture congestion instead of PL-only workload.

Currently a player who played Saturday PL + Tuesday UCL + Saturday PL looks identical to one who only played the two PL matches. That's exactly the congestion pattern most likely to cause soft-tissue injury — and we're missing it.

## Design decisions

1. **Only fetch fixtures involving PL clubs.** Cup/Euro leagues contain many non-PL teams. Before calling `/fixtures/players`, filter the fixture list to those where `home_id OR away_id` is in the set of PL club IDs across 2022–2025 (~26 unique clubs counting promoted/relegated sides).
2. **Fixture IDs are globally unique in API-Football** — no collision risk when concatenating.
3. **`season` column = PL season year.** FA Cup 2024 and UCL 2024 are the same API season value as PL 2024, so alignment is automatic.
4. **No changes required to feature engineering.** `engineer_rolling_features.py` groups by `player_id` and keys off `date` + `minutes` — it doesn't care which competition. Adding cup/Euro rows to `match_stats.csv` passively enriches rolling windows.
5. **Per-league-season raw files** to avoid clobbering PL raw files. Naming: `fixtures_{league}_{season}.json`, `match_stats_{league}_{season}.json`. PL files keep existing names (special-case `league=39`).
6. **Dedup safety** already exists in `build_match_stats.py` on `(player_id, fixture_id)` — no change needed.

## Commands to run (in order)

```bash
# 1. Fetch fixture lists for 5 cup/Euro competitions across 4 seasons (~20 calls, instant)
python3.14 collect_fixtures_cups.py

# 2. Fetch player stats for PL-involving fixtures only (~800 calls, ~7 min)
python3.14 collect_match_stats_cups.py

# 3. Rebuild match_stats.csv — now concatenates PL + 5 extra leagues × 4 seasons
python3.14 build_match_stats.py

# 4. Re-run feature pipeline (no code changes — passive lift from denser match history)
python3.14 engineer_rolling_features.py
python3.14 engineer_season_features.py
python3.14 engineer_injury_features.py
python3.14 engineer_profile_features.py
python3.14 engineer_target.py

# 5. Retrain
python3.14 train_model.py
```

---

## Files to create

### 1. `ml/collect_fixtures_cups.py` (new)

```python
CUP_LEAGUES = {
    45:  "FA Cup",
    48:  "EFL Cup",
    2:   "UCL",
    3:   "UEL",
    848: "UECL",
}
```
- Loops `(league_id, season) in CUP_LEAGUES × ALL_SEASONS` → `GET /fixtures?league={id}&season={s}&status=FT`
- Saves each to `data/raw/fixtures_{league}_{season}.json`
- Progress key: `fixtures_{league}_{season}_done`
- ~20 calls total, one-shot

### 2. `ml/collect_match_stats_cups.py` (new)

- First, **build the PL club ID set** by loading all existing `fixtures_{season}.json` (league 39) files and extracting `teams.home.id` + `teams.away.id`. Store as `PL_CLUB_IDS`.
- For each `(league_id, season)` in `CUP_LEAGUES × ALL_SEASONS`:
  - Load `fixtures_{league}_{season}.json`
  - **Filter** to fixtures where `home.id in PL_CLUB_IDS or away.id in PL_CLUB_IDS`
  - For each kept fixture, call `/fixtures/players?fixture={id}` (same as PL collector)
  - Save to `match_stats_{league}_{season}.json` keyed by `fixture_id` string
  - Progress key: `match_stats_{league}_{season}_done` (list of fixture_id strings)
  - Save every 50 fixtures + final save per season
- Print estimated remaining calls up front.

---

## Files to modify

### 3. `ml/config.py`
Add:
```python
CUP_LEAGUES = {45: "FA Cup", 48: "EFL Cup", 2: "UCL", 3: "UEL", 848: "UECL"}

def cup_fixtures_file(league: int, season: int) -> Path:
    return RAW_DIR / f"fixtures_{league}_{season}.json"

def cup_match_stats_file(league: int, season: int) -> Path:
    return RAW_DIR / f"match_stats_{league}_{season}.json"
```

### 4. `ml/build_match_stats.py`
In `main()`, after the existing PL loop, add a second loop:
```python
for season in ALL_SEASONS:
    for league_id in CUP_LEAGUES:
        path = cup_match_stats_file(league_id, season)
        if path.exists():
            all_rows.extend(parse_season_from_path(path, season, competition=CUP_LEAGUES[league_id]))
```
Refactor `parse_season(season)` into `parse_season_from_path(path, season, competition="PL")` so it accepts a path directly (PL call stays the same via `match_stats_file(season)`). Add a `competition` column to every row: `"PL"` for league 39 rows, otherwise `CUP_LEAGUES[league_id]`. Useful for debugging and future "UCL-match boolean" features.

### 5. `ml/Makefile`
Add:
```
collect-cups:
	python3.14 collect_fixtures_cups.py
	python3.14 collect_match_stats_cups.py
	python3.14 build_match_stats.py
```

---

## API cost breakdown (estimated)

| League | Fixtures/season | PL-involving/season | × 4 seasons |
|---|---|---|---|
| FA Cup (45) | ~120 | ~60 | ~240 |
| EFL Cup (48) | ~90 | ~50 | ~200 |
| UCL (2) | ~125 | ~50 | ~200 |
| UEL (3) | ~140 | ~25 | ~100 |
| UECL (848) | ~140 | ~15 | ~60 |
| **Total** | | | **~800 calls** |

Plus 20 fixture-list calls. **Pro tier (7,500/day) handles it in a single ~7-minute run.**

---

## Potential problems

| Problem | Mitigation |
|---|---|
| Cup fixture `status=FT` excludes walkovers / abandoned matches | Acceptable — those had no meaningful minutes |
| PL-involving filter misses fixtures where a player transferred mid-season from a non-PL team that later played the tie | Negligible edge case; filter by team-id is simpler and accurate to >99% of rows |
| `engineer_season_features.py` reads `/players?id&season` which is already PL-only | No change needed. Cup/Euro per-90 trends can be added later if desired |
| `predict_players.py` expects rolling features at upcoming PL fixture dates | Unchanged — rolling computation just has more matches to window over |
| Duplicate rows if a player somehow appears twice | Existing `drop_duplicates(["player_id","fixture_id"], keep="first")` handles this |
| `match_density_14d` will jump from ~2 to ~4 for UCL clubs during congested weeks — feature distribution shifts | Expected and desired. Retraining from scratch absorbs the shift. |

---

## Verification

```bash
python3.14 -c "
import pandas as pd
df = pd.read_csv('../data/match_stats.csv')
print('Total rows:', len(df))
if 'competition' in df.columns:
    print('By competition:', df.groupby('competition').size().to_dict())
print('Avg matches/player/season:', df.groupby(['player_id','season']).size().mean())
"
```
**Expected:** total rows ~70k–75k (was 58k), avg matches/player/season rises from ~14 to ~17–20 for UCL-club players.

Before/after retraining, compare:
- PR-AUC on test set
- Feature importance of `acute_chronic_ratio`, `match_density_14d`, `minutes_last_14d` — these should rise if the hypothesis is right

---

## Stretch options (Pro tier makes these cheap)

If the cup ingestion shows a real PR-AUC lift, the next natural extensions are:

| Option | Extra calls | Value |
|---|---|---|
| Historical PL backfill 2018–2021 | ~4,000 | Modest — more label data, older era |
| `/fixtures/events` (catches in-match injury subs) | ~3,400 | High — improves label accuracy |
| `/fixtures/lineups` (benched-for-rest vs benched-injured) | ~3,400 | Medium |

All three combined = ~11,600 calls, still a single day on Pro (75% headroom).
