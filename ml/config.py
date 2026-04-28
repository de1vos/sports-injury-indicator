"""
Global config — API key, constants, paths.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# .env lives in the project root (one level up from ml/)
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

# API
API_KEY  = os.getenv("API_FOOTBALL_KEY")
BASE_URL = "https://v3.football.api-sports.io"
HEADERS  = {"x-apisports-key": API_KEY}

# League
LEAGUE             = 39
CURRENT_SEASON     = 2025
HISTORICAL_SEASONS = [2022, 2023, 2024]
ALL_SEASONS        = HISTORICAL_SEASONS + [CURRENT_SEASON]

# Rate limiting
DELAY = 0.5  # seconds between API calls

# Paths — all relative to project root
DATA_DIR   = ROOT / "data"
RAW_DIR    = ROOT / "data" / "raw"
MODELS_DIR = ROOT / "models"
OUTPUT_DIR = ROOT / "output"

PROGRESS_FILE          = ROOT / "data" / "progress.json"
PLAYERS_FILE           = ROOT / "data" / "raw" / "players_season_stats.json"
FIXTURES_FILE          = ROOT / "data" / "raw" / "fixtures_2025.json"
FIXTURES_PREV_FILE     = ROOT / "data" / "raw" / "fixtures_2024.json"
FIXTURES_UPCOMING_FILE = ROOT / "data" / "raw" / "fixtures_upcoming.json"
MATCH_STATS_FILE       = ROOT / "data" / "raw" / "match_stats_2025.json"
SQUADS_FILE            = ROOT / "data" / "raw" / "squads.json"
SIDELINED_FILE         = ROOT / "data" / "raw" / "sidelined.json"

# Per-season file helpers (Premier League)
def fixtures_file(season: int) -> Path:
    return RAW_DIR / f"fixtures_{season}.json"

def match_stats_file(season: int) -> Path:
    return RAW_DIR / f"match_stats_{season}.json"

# Cup / European competition helpers
CUP_LEAGUES = {
    45:  "FA Cup",
    48:  "EFL Cup",
    2:   "UCL",
    3:   "UEL",
    848: "UECL",
}

def cup_fixtures_file(league: int, season: int) -> Path:
    return RAW_DIR / f"fixtures_{league}_{season}.json"

def cup_match_stats_file(league: int, season: int) -> Path:
    return RAW_DIR / f"match_stats_{league}_{season}.json"


PLAYERS_CSV      = ROOT / "data" / "players.csv"
SEASON_STATS_CSV = ROOT / "data" / "season_stats.csv"
MATCH_STATS_CSV  = ROOT / "data" / "match_stats.csv"
INJURIES_CSV     = ROOT / "data" / "injuries.csv"
ML_FEATURES_CSV  = ROOT / "data" / "ml_features.csv"

MODEL_FILE              = ROOT / "models" / "injury_predictor.pkl"
PREDICTIONS_OUTPUT_FILE = ROOT / "output" / "player_predictions.json"
MATCHES_OUTPUT_FILE     = ROOT / "output" / "matches.json"

# Risk level thresholds
RISK_THRESHOLDS = {
    "Low":      (0.00, 0.20),
    "Medium":   (0.20, 0.45),
    "High":     (0.45, 0.70),
    "Critical": (0.70, 1.00),
}

# Injury severity (days out)
SEVERITY_THRESHOLDS = {
    "Minor":     (1,  7),
    "Moderate":  (8,  28),
    "Severe":    (29, 90),
    "Long-term": (91, 99999),
}

# FIFA/UEFA international break windows (player release → return)
# Hardcoded from official FIFA match calendar + UEFA competition schedules.
# Used in engineer_rolling_features.py to flag post-break injury risk.
INTL_BREAK_WINDOWS = [
    # 2022/23
    ("2022-09-19", "2022-09-27"),   # UEFA NL GW5-6
    ("2022-10-10", "2022-10-18"),   # UEFA NL GW6 + friendlies
    ("2022-11-14", "2022-11-29"),   # World Cup window start
    ("2023-03-20", "2023-03-28"),   # UEFA qualifiers GW1-2
    ("2023-06-12", "2023-06-20"),   # UEFA qualifiers GW5-6
    # 2023/24
    ("2023-09-04", "2023-09-12"),   # UEFA qualifiers GW7-8
    ("2023-10-09", "2023-10-17"),   # UEFA qualifiers GW9-10
    ("2024-03-18", "2024-03-26"),   # UEFA qualifiers play-offs
    ("2024-06-03", "2024-06-11"),   # Friendlies / NL finals
    # 2024/25
    ("2024-09-02", "2024-09-10"),   # UEFA NL GW1-2
    ("2024-10-07", "2024-10-15"),   # UEFA NL GW3-4
    ("2024-11-11", "2024-11-19"),   # UEFA NL GW5-6
    ("2025-03-17", "2025-03-25"),   # UEFA WCQ GW1-2
    ("2025-06-02", "2025-06-10"),   # UEFA NL finals
    # 2025/26
    ("2025-09-01", "2025-09-09"),   # UEFA WCQ GW3-4
    ("2025-10-06", "2025-10-14"),   # UEFA WCQ GW5-6
    ("2025-11-10", "2025-11-18"),   # UEFA WCQ GW7-8
    ("2026-03-23", "2026-03-31"),   # UEFA WCQ GW9-10
]

# Body region mapping (substring → region)
BODY_REGION_MAP = {
    "hamstring": "Thigh",
    "quad":      "Thigh",
    "thigh":     "Thigh",
    "acl":       "Knee",
    "knee":      "Knee",
    "meniscus":  "Knee",
    "ankle":     "Ankle",
    "groin":     "Groin",
    "adductor":  "Groin",
    "hip":       "Hip",
    "calf":      "Calf",
    "achilles":  "Achilles",
    "foot":      "Foot",
    "back":      "Back",
    "spine":     "Back",
    "shoulder":  "Shoulder",
    "arm":       "Arm",
    "elbow":     "Arm",
    "wrist":     "Arm",
    "hand":      "Arm",
    "head":      "Head",
    "concussion":"Head",
    "neck":      "Neck",
    "rib":       "Torso",
    "chest":     "Torso",
    "illness":       "Illness",
    "virus":         "Illness",
    "covid":         "Illness",
    "fever":         "Illness",
    "suspended":     "Disciplinary",
    "yellow card":   "Disciplinary",
    "red card":      "Disciplinary",
    "loan":          "Administrative",
    "international": "Administrative",
    "duty":          "Administrative",
    "personal":      "Administrative",
}

# Regions that aren't real injuries — excluded from injury counts and the model target.
NON_INJURY_REGIONS       = {"Disciplinary", "Administrative"}
# Illness is unavailability but not musculoskeletal — exclude from the prediction target,
# but the user-facing "matches missed" stats may still want to include it.
INJURY_REGIONS_FOR_MODEL = NON_INJURY_REGIONS | {"Illness"}
