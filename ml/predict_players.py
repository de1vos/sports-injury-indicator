"""
Phase 5 — Live predictions

For every active 2025/26 PL player:
  - Current injury risk score (calibrated probability 0–1)
  - Risk trend over last 38 matches this season (raw scores, with injured markers)
  - Top 3 risk factors (SHAP if available, else rule-based)
  - Season stats (current + previous season)
  - Injury summary and full injury history
  - Next match

Outputs:
  output/predictions.json  — player data + predictions (consumed by frontend)
  output/matches.json      — completed + upcoming fixtures (±2 weeks)

Run: python3.14 predict_players.py
  or: make predict
"""

import json
import pickle
import warnings
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone

from config import (
    PLAYERS_CSV, SEASON_STATS_CSV, INJURIES_CSV, ML_FEATURES_CSV,
    FIXTURES_FILE, FIXTURES_PREV_FILE, FIXTURES_UPCOMING_FILE,
    MODEL_FILE, OUTPUT_DIR, RISK_THRESHOLDS, CURRENT_SEASON,
)
from model_utils import SigmoidCalibrator  # required for pickle deserialization

# Optional: SHAP for explainable risk factors
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

TREND_MATCHES = 38
TWO_WEEKS     = timedelta(days=14)

SEASON_STATS_COLS = [
    "appearances", "minutes", "rating", "goals", "assists",
    "tackles", "interceptions", "duels_total", "duels_won",
    "dribbles_attempts", "dribbles_success",
    "fouls_committed", "fouls_drawn",
    "yellow_cards", "red_cards",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_risk_level(prob: float) -> str:
    for level, (lo, hi) in RISK_THRESHOLDS.items():
        if lo <= prob < hi:
            return level
    return "Critical"


def safe_float(val, decimals=4):
    try:
        v = float(val)
        return None if np.isnan(v) else round(v, decimals)
    except Exception:
        return None


def safe_int(val):
    try:
        v = float(val)
        return None if np.isnan(v) else int(v)
    except Exception:
        return None


def safe_str(val):
    s = str(val) if val is not None else ""
    return None if s.lower() in ("nan", "none", "") else s


# ── Risk factor templates ─────────────────────────────────────────────────────

# Maps feature name → function(value) → human-readable string
FACTOR_TEMPLATES = {
    "injuries_last_24_months":    lambda v: f"{int(v)} injuries in last 24 months",
    "injuries_last_12_months":    lambda v: f"{int(v)} injuries in last 12 months",
    "matches_last_30d":           lambda v: f"High match load: {int(v)} games in last 30 days",
    "minutes_last_30d":           lambda v: f"High workload: {int(v)} min in last 30 days",
    "avg_minutes_per_match_30d":  lambda v: f"High avg load: {int(v)} min/game (last 30d)",
    "acute_chronic_ratio":        lambda v: f"Workload spike: ACWR {v:.2f}",
    "days_since_last_injury":     lambda v: f"Recently returned from injury ({int(v)} days ago)",
    "consecutive_90min_starts":   lambda v: f"{int(v)} consecutive 90-min starts",
    "workload_trend":              lambda v: f"Workload up {v * 100:.0f}% vs previous month",
    "age":                        lambda v: f"Age-related risk ({int(v)} years old)",
    "yellow_cards_last_30d":      lambda v: f"{int(v)} yellow cards in last 30 days",
    "avg_recovery_days":          lambda v: f"Average recovery: {int(v)} days per injury",
    "matches_missed_this_season": lambda v: f"{int(v)} matches missed this season",
    "recovery_trend":             lambda v: "Recovery times trending longer",
}

# Rules used for fallback (without SHAP): threshold → show factor
FACTOR_RULES = [
    # (feature,                   condition,              template_key or None)
    ("days_since_last_injury",    lambda v: 0 < v <= 30, "days_since_last_injury"),
    ("injuries_last_24_months",   lambda v: v >= 3,       "injuries_last_24_months"),
    ("injuries_last_12_months",   lambda v: v >= 2,       "injuries_last_12_months"),
    ("acute_chronic_ratio",       lambda v: v >= 1.3,     "acute_chronic_ratio"),
    ("consecutive_90min_starts",  lambda v: v >= 4,       "consecutive_90min_starts"),
    ("matches_last_30d",          lambda v: v >= 6,       "matches_last_30d"),
    ("minutes_last_30d",          lambda v: v >= 450,     "minutes_last_30d"),
    ("workload_trend",             lambda v: v >= 0.15,    "workload_trend"),
    ("yellow_cards_last_30d",     lambda v: v >= 3,       "yellow_cards_last_30d"),
    ("age",                       lambda v: v >= 30,      "age"),
    ("recovery_trend",            lambda v: v > 0,        "recovery_trend"),
]


def _recurring_factor(row_data: dict) -> str | None:
    """Returns a risk factor string if recurring injury flag is set."""
    flag = row_data.get("recurring_injury_flag", 0)
    if not flag or (isinstance(flag, float) and np.isnan(flag)) or flag < 1:
        return None
    itype = safe_str(row_data.get("recurring_injury_type"))
    if itype:
        return f"History of recurring {itype}"
    return "Recurring injury pattern"


def get_risk_factors_shap(shap_row: np.ndarray, feature_cols: list, row_data: dict) -> list[str]:
    """Top 3 risk factors based on SHAP values (most impactful features pushing risk up)."""
    factors = []

    # Recurring injury handled separately (not a numeric SHAP story)
    rec = _recurring_factor(row_data)
    if rec:
        factors.append(rec)

    # Sort features by SHAP contribution (descending), positive only
    ranked = sorted(
        [(col, shap_row[i]) for i, col in enumerate(feature_cols) if shap_row[i] > 0],
        key=lambda x: x[1], reverse=True,
    )

    for feature, _ in ranked:
        if feature == "recurring_injury_flag":
            continue
        if feature not in FACTOR_TEMPLATES:
            continue
        val = row_data.get(feature)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            continue
        try:
            factors.append(FACTOR_TEMPLATES[feature](val))
        except Exception:
            continue
        if len(factors) >= 3:
            break

    return factors[:3]


def get_risk_factors_rules(row_data: dict) -> list[str]:
    """Rule-based fallback when SHAP is not available."""
    factors = []

    rec = _recurring_factor(row_data)
    if rec:
        factors.append(rec)

    for feature, condition, tmpl_key in FACTOR_RULES:
        val = row_data.get(feature)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            continue
        try:
            if condition(val) and tmpl_key:
                factors.append(FACTOR_TEMPLATES[tmpl_key](val))
        except Exception:
            continue
        if len(factors) >= 3:
            break

    return factors[:3]


# ── Season stats ──────────────────────────────────────────────────────────────

def get_all_season_stats(season_stats_df: pd.DataFrame, player_id: int) -> list[dict]:
    rows = season_stats_df[season_stats_df["player_id"] == player_id].sort_values(
        "season", ascending=False
    )
    result = []
    for _, row in rows.iterrows():
        entry = {"season": int(row["season"])}
        for col in SEASON_STATS_COLS:
            if col not in row.index:
                continue
            entry[col] = safe_float(row[col], 2) if col == "rating" else safe_int(row[col])
        result.append(entry)
    return result


# ── Injury history ────────────────────────────────────────────────────────────

def get_injury_history(injuries_df: pd.DataFrame, player_id: int) -> list[dict]:
    rows = injuries_df[injuries_df["player_id"] == player_id].sort_values(
        "start_date", ascending=False
    )
    history = []
    for _, row in rows.iterrows():
        itype = safe_str(row.get("injury_type"))
        if not itype:
            continue
        history.append({
            "type":        itype,
            "start":       str(row["start_date"].date()) if pd.notna(row["start_date"]) else None,
            "end":         str(row["end_date"].date())   if pd.notna(row["end_date"])   else None,
            "days_out":    safe_int(row.get("days_out")),
            "severity":    safe_str(row.get("severity")),
            "body_region": safe_str(row.get("body_region")),
        })
    return history


# ── Next match ────────────────────────────────────────────────────────────────

def get_next_match(team_id: int, upcoming_fixtures: list) -> dict | None:
    now = datetime.now(timezone.utc)
    for fx in sorted(upcoming_fixtures, key=lambda x: x["fixture"]["date"]):
        if team_id not in (fx["teams"]["home"]["id"], fx["teams"]["away"]["id"]):
            continue
        date_str = fx["fixture"]["date"]
        fx_date  = datetime.fromisoformat(date_str)
        if fx_date.tzinfo is None:
            fx_date = fx_date.replace(tzinfo=timezone.utc)
        if fx_date >= now:
            return {
                "fixture_id": fx["fixture"]["id"],
                "date":       date_str,
                "home_team":  fx["teams"]["home"]["name"],
                "home_logo":  fx["teams"]["home"]["logo"],
                "away_team":  fx["teams"]["away"]["name"],
                "away_logo":  fx["teams"]["away"]["logo"],
                "venue":      fx["fixture"]["venue"]["name"],
                "round":      fx["league"]["round"],
            }
    return None


# ── Matches JSON ──────────────────────────────────────────────────────────────

def build_matches_json(fixtures_2025: list, fixtures_upcoming: list) -> dict:
    now             = datetime.now(timezone.utc)
    two_weeks_ago   = now - TWO_WEEKS
    two_weeks_ahead = now + TWO_WEEKS

    def parse_dt(d: str) -> datetime:
        dt = datetime.fromisoformat(d)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    def fmt(fx: dict, include_score: bool) -> dict:
        out = {
            "fixture_id": fx["fixture"]["id"],
            "date":       fx["fixture"]["date"],
            "round":      fx["league"]["round"],
            "home_team":  {"name": fx["teams"]["home"]["name"], "logo": fx["teams"]["home"]["logo"]},
            "away_team":  {"name": fx["teams"]["away"]["name"], "logo": fx["teams"]["away"]["logo"]},
            "venue":      fx["fixture"]["venue"]["name"],
        }
        if include_score:
            g = fx.get("goals", {})
            out["score"] = {"home": g.get("home"), "away": g.get("away")}
        return out

    completed = []
    for fx in fixtures_2025:
        try:
            d = parse_dt(fx["fixture"]["date"])
            if two_weeks_ago <= d <= now:
                completed.append(fmt(fx, include_score=True))
        except Exception:
            continue
    completed.sort(key=lambda x: x["date"], reverse=True)

    upcoming = []
    for fx in fixtures_upcoming:
        try:
            d = parse_dt(fx["fixture"]["date"])
            if now < d <= two_weeks_ahead:
                upcoming.append(fmt(fx, include_score=False))
        except Exception:
            continue
    upcoming.sort(key=lambda x: x["date"])

    return {"completed": completed, "upcoming": upcoming}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    warnings.filterwarnings("ignore")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── Load ─────────────────────────────────────────────────────────────────
    print("Loading model and data...")

    with open(MODEL_FILE, "rb") as f:
        bundle = pickle.load(f)

    calibrated_model = bundle["model"]
    raw_model        = bundle["raw_model"]
    feature_cols     = bundle["feature_cols"]

    players      = pd.read_csv(PLAYERS_CSV)
    season_stats = pd.read_csv(SEASON_STATS_CSV)
    injuries     = pd.read_csv(INJURIES_CSV, parse_dates=["start_date", "end_date"])
    ml           = pd.read_csv(ML_FEATURES_CSV, parse_dates=["date"])

    with open(FIXTURES_FILE) as f:
        fixtures_2025 = json.load(f)
    with open(FIXTURES_PREV_FILE) as f:
        fixtures_2024 = json.load(f)
    with open(FIXTURES_UPCOMING_FILE) as f:
        fixtures_upcoming = json.load(f)

    if not SHAP_AVAILABLE:
        print("  shap not installed — using rule-based risk factors")
        print("  Install with: pip install shap\n")

    # ── Per-team fixture schedule (backbone for trend) ────────────────────────
    team_to_fixtures: dict[int, list] = {}
    for fx in fixtures_2024 + fixtures_2025:
        for side in ("home", "away"):
            tid = fx["teams"][side]["id"]
            team_to_fixtures.setdefault(tid, []).append(fx)
    for tid in team_to_fixtures:
        team_to_fixtures[tid].sort(key=lambda x: x["fixture"]["date"])

    # ── Fixture → gameweek lookup ─────────────────────────────────────────────
    # Round format: "Regular Season - 33" → "GW33"
    fixture_to_gw: dict[int, str] = {}
    for fx in fixtures_2024 + fixtures_2025 + fixtures_upcoming:
        fid   = fx["fixture"]["id"]
        round_str = fx["league"].get("round", "")
        parts = round_str.rsplit("-", 1)
        if len(parts) == 2 and parts[1].strip().isdigit():
            fixture_to_gw[fid] = f"GW{parts[1].strip()}"
        else:
            fixture_to_gw[fid] = round_str  # fallback: use raw string

    # ── Current gameweek ──────────────────────────────────────────────────────
    # Last completed GW = highest GW number in fixtures_2025
    now = datetime.now(timezone.utc)
    completed_gws = []
    for fx in fixtures_2025:
        parts = fx["league"].get("round", "").rsplit("-", 1)
        if len(parts) == 2 and parts[1].strip().isdigit():
            fx_date = datetime.fromisoformat(fx["fixture"]["date"])
            if fx_date.tzinfo is None:
                fx_date = fx_date.replace(tzinfo=timezone.utc)
            if fx_date < now:
                completed_gws.append(int(parts[1].strip()))
    current_gameweek = max(completed_gws) if completed_gws else 1
    print(f"Current gameweek: GW{current_gameweek}")

    # ── Active 2025/26 players ────────────────────────────────────────────────
    current    = ml[ml["season"] == CURRENT_SEASON].copy()
    active_ids = current["player_id"].unique()
    print(f"Active 2025/26 players: {len(active_ids)}")

    # ── Most recent feature row per player ────────────────────────────────────
    current_rows = (
        current.sort_values("date")
               .groupby("player_id")
               .last()
               .reset_index()
    )
    X_current    = current_rows[feature_cols].fillna(0)
    current_probs = calibrated_model.predict_proba(X_current)[:, 1]
    current_rows["_risk"] = current_probs

    # player_id → row position in current_rows
    pid_to_pos = {int(row["player_id"]): i for i, row in current_rows.iterrows()}

    # ── SHAP (batch, computed once for all players) ───────────────────────────
    shap_values = None
    if SHAP_AVAILABLE:
        print("Computing SHAP values...")
        explainer = shap.TreeExplainer(raw_model)
        sv = explainer.shap_values(X_current)
        shap_values = sv[1] if isinstance(sv, list) else sv  # positive class

    # ── Players lookup ────────────────────────────────────────────────────────
    players_idx = players.set_index("player_id")

    # ── Build records ─────────────────────────────────────────────────────────
    print("Building player records...")
    records = []

    for player_id in active_ids:
        player_id = int(player_id)

        if player_id not in players_idx.index:
            continue

        pos = pid_to_pos.get(player_id)
        if pos is None:
            continue

        prof     = players_idx.loc[player_id]
        cur_row  = current_rows.iloc[pos]
        row_data = cur_row.to_dict()

        injury_risk = float(current_rows.iloc[pos]["_risk"])

        # Risk factors
        if SHAP_AVAILABLE and shap_values is not None:
            factors = get_risk_factors_shap(shap_values[pos], feature_cols, row_data)
        else:
            factors = get_risk_factors_rules(row_data)

        # Injuries across both seasons for injured-gameweek detection
        player_injuries = injuries[
            (injuries["player_id"] == player_id) &
            (injuries["start_date"] >= pd.Timestamp(f"{CURRENT_SEASON - 1}-07-01"))
        ]

        # Risk trend — 38 slots always labeled GW1–GW38.
        # Current season fills GW1 onwards; previous season backfills the tail.
        team_id_int = safe_int(prof.get("team_id"))
        season_cut  = pd.Timestamp(f"{CURRENT_SEASON}-07-01")

        curr_fixtures = [fx for fx in (team_to_fixtures.get(team_id_int) or [])
                         if pd.Timestamp(fx["fixture"]["date"][:10]) >= season_cut]
        prev_fixtures = [fx for fx in (team_to_fixtures.get(team_id_int) or [])
                         if pd.Timestamp(fx["fixture"]["date"][:10]) < season_cut]

        n_current = len(curr_fixtures)                        # e.g. 32
        n_prev    = max(0, TREND_MATCHES - n_current)         # e.g. 6
        # Take the last n_prev fixtures from previous season
        ordered_fixtures = prev_fixtures[-n_prev:] + curr_fixtures  # prev tail → curr

        # Player's feature rows keyed by fixture_id
        player_fid_map = (
            ml[ml["player_id"] == player_id]
            .sort_values("date")
            .drop_duplicates("fixture_id", keep="last")
            .set_index("fixture_id")
        )

        # Batch-predict all fixtures where player has a feature row
        played_fids = [fx["fixture"]["id"] for fx in ordered_fixtures
                       if fx["fixture"]["id"] in player_fid_map.index]
        if played_fids:
            X_batch      = player_fid_map.loc[played_fids][feature_cols].fillna(0)
            scores       = calibrated_model.predict_proba(X_batch)[:, 1]
            fid_to_score = {fid: round(float(s), 4) for fid, s in zip(played_fids, scores)}
        else:
            fid_to_score = {}

        trend     = {}
        last_risk = None

        for slot, fx in enumerate(ordered_fixtures, start=1):
            fid     = fx["fixture"]["id"]
            fx_date = pd.Timestamp(fx["fixture"]["date"][:10])
            gw_key  = f"GW{slot}"

            # Was the player injured on this date?
            injured = False
            for _, inj in player_injuries.iterrows():
                if pd.isna(inj["start_date"]):
                    continue
                end_check = inj["end_date"] if pd.notna(inj["end_date"]) else pd.Timestamp("2099-01-01")
                if inj["start_date"] <= fx_date <= end_check:
                    injured = True
                    break

            if injured:
                risk_val = "Injured"
            elif fid in fid_to_score:
                last_risk = fid_to_score[fid]
                risk_val  = last_risk
            else:
                risk_val = last_risk if last_risk is not None else round(injury_risk, 4)

            trend[gw_key] = risk_val

        # Season stats — all available seasons, newest first
        all_season_stats = get_all_season_stats(season_stats, player_id)

        # Injury data
        injury_history = get_injury_history(injuries, player_id)
        injury_summary = {
            "career_total_injuries":      safe_int(row_data.get("career_total_injuries")),
            "injuries_this_season":       safe_int(row_data.get("injuries_this_season")),
            "days_since_last_injury":     safe_int(row_data.get("days_since_last_injury")),
            "matches_missed_this_season": safe_int(row_data.get("matches_missed_this_season")),
            "minutes_missed_this_season": safe_int(row_data.get("minutes_missed_this_season")),
            "matches_missed_career":      safe_int(row_data.get("matches_missed_career")),
        }

        # Workload
        workload = {
            "minutes_last_30d":         safe_int(row_data.get("minutes_last_30d")),
            "matches_last_30d":         safe_int(row_data.get("matches_last_30d")),
            "acute_chronic_ratio":      safe_float(row_data.get("acute_chronic_ratio"), 2),
            "match_density_14d":        safe_int(row_data.get("match_density_14d")),
            "fouls_against_per_90":     safe_float(row_data.get("fouls_against_per_90_rolling"), 2),
            "consecutive_90min_starts": safe_int(row_data.get("consecutive_90min_starts")),
        }

        # Next match
        next_match = get_next_match(team_id_int, fixtures_upcoming) if team_id_int else None

        records.append({
            "player_id":   player_id,
            "name":        safe_str(prof.get("name"))        or "",
            "firstname":   safe_str(prof.get("firstname"))   or "",
            "lastname":    safe_str(prof.get("lastname"))    or "",
            "photo":       safe_str(prof.get("photo"))       or "",
            "team":        safe_str(prof.get("current_team")) or "",
            "team_logo":   safe_str(prof.get("team_logo"))   or "",
            "position":    safe_str(prof.get("position"))    or "",
            "age":         safe_int(prof.get("age")),
            "height":      safe_int(prof.get("height")),
            "weight":      safe_int(prof.get("weight")),
            "nationality": safe_str(prof.get("nationality")) or "",
            "kit_number":  safe_int(prof.get("kit_number")),

            "injury_risk":       round(injury_risk, 4),
            "risk_level":        get_risk_level(injury_risk),
            "risk_factor_1":     factors[0] if len(factors) > 0 else None,
            "risk_factor_2":     factors[1] if len(factors) > 1 else None,
            "risk_factor_3":     factors[2] if len(factors) > 2 else None,
            "injury_risk_trend": trend,   # {"GW1": 0.35, "GW2": "Injured", ...}

            "season_stats": all_season_stats,
            "workload":              workload,
            "injury_summary":        injury_summary,
            "injury_history":        injury_history,
            "next_match":            next_match,
        })

    records.sort(key=lambda x: x["injury_risk"], reverse=True)
    print(f"  Built {len(records)} player records")

    # ── Matches JSON ──────────────────────────────────────────────────────────
    print("Building matches JSON...")
    matches = build_matches_json(fixtures_2025, fixtures_upcoming)
    print(f"  Completed (±2 weeks): {len(matches['completed'])}  "
          f"Upcoming (±2 weeks): {len(matches['upcoming'])}")

    # ── Save ──────────────────────────────────────────────────────────────────
    pred_path    = OUTPUT_DIR / "predictions.json"
    matches_path = OUTPUT_DIR / "matches.json"

    output = {
        "current_gameweek": current_gameweek,
        "current_season":   CURRENT_SEASON,
        "generated_at":     datetime.now(timezone.utc).isoformat(),
        "players":          records,
    }
    with open(pred_path, "w") as f:
        json.dump(output, f, indent=2, default=str)
    with open(matches_path, "w") as f:
        json.dump(matches, f, indent=2, default=str)

    print(f"\n{'─'*50}")
    print(f"Players:  {pred_path}  ({len(records)} players)")
    print(f"Matches:  {matches_path}")
    print(f"SHAP:     {'enabled' if SHAP_AVAILABLE else 'disabled (pip install shap)'}")

    print(f"\nTop 10 highest-risk players:")
    print(f"  {'Name':<25} {'Team':<22} {'Risk':>6}  Level")
    print(f"  {'-'*65}")
    for r in records[:10]:
        print(f"  {r['name']:<25} {r['team']:<22} {r['injury_risk']:>6.1%}  {r['risk_level']}")


if __name__ == "__main__":
    main()
