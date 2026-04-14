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
FIXTURES_UPCOMING_FILE = ROOT / "data" / "raw" / "fixtures_upcoming.json"
MATCH_STATS_FILE       = ROOT / "data" / "raw" / "match_stats_2025.json"
SQUADS_FILE            = ROOT / "data" / "raw" / "squads.json"
SIDELINED_FILE         = ROOT / "data" / "raw" / "sidelined.json"

# Per-season file helpers
def fixtures_file(season: int) -> Path:
    return RAW_DIR / f"fixtures_{season}.json"

def match_stats_file(season: int) -> Path:
    return RAW_DIR / f"match_stats_{season}.json"


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
    "illness":   "Illness",
    "virus":     "Illness",
    "covid":     "Illness",
    "suspended": "Disciplinary",
}
