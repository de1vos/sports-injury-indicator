from typing import List, TypedDict
from sqlalchemy import text
from sqlmodel import Session


class GameWeekMatches(TypedDict):
    home_team_name: str
    away_team_name: str
    home_team_logo: str
    away_team_logo: str
    home_team_goals: int | None
    away_team_goals: int | None
    home_average_injury_risk: int | None
    away_average_injury_risk: int | None
    match_time: str | None
    match_date: str
    match_is_played: bool


class HighRiskPlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_id: int
    team_name: str
    player_position: str
    player_injury_risk: int
    player_relative_risk: float
    player_seasonal_injuries: int


class TrendingRiskPlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_id: int
    team_name: str
    player_position: str
    player_injury_trend: int
    player_seasonal_injuries: int


def get_game_week_matches(session: Session) -> List[GameWeekMatches]:
    rows = session.execute(text("SELECT * FROM mv_game_week_matches")).mappings().all()
    return [
        {
            "home_team_name": row["home_team_name"],
            "away_team_name": row["away_team_name"],
            "home_team_logo": row["home_team_logo"],
            "away_team_logo": row["away_team_logo"],
            "home_team_goals": row["match_goals_home"] if row["match_is_played"] else None,
            "away_team_goals": row["match_goals_away"] if row["match_is_played"] else None,
            "home_average_injury_risk": None if row["match_is_played"] else round(float(row["home_avg_injury_risk"]) * 100),
            "away_average_injury_risk": None if row["match_is_played"] else round(float(row["away_avg_injury_risk"]) * 100),
            "match_time": str(row["match_time"]) if row["match_time"] else None,
            "match_date": str(row["match_date"]),
            "match_is_played": row["match_is_played"],
        }
        for row in rows
    ]


def get_high_risk_players(session: Session, user_id: int | None = None) -> List[HighRiskPlayer]:
    if user_id is not None:
        rows = session.execute(
            text("""
                SELECT mv.* FROM mv_player_overview mv
                JOIN user_favourite uf
                  ON uf.player_id = mv.player_id AND uf.user_id = :uid
                WHERE mv.player_relative_risk > 2.0
                ORDER BY mv.player_relative_risk DESC
            """),
            {"uid": user_id}
        ).mappings().all()
    else:
        rows = session.execute(
            text("""
                SELECT * FROM mv_player_overview
                WHERE player_relative_risk > 2.0
                ORDER BY player_relative_risk DESC
            """)
        ).mappings().all()
    return [
        {
            "player_id": row["player_id"],
            "player_first_name": row["player_first_name"],
            "player_last_name": row["player_last_name"],
            "player_photo": row["player_photo"],
            "team_id": row["team_id"],
            "team_name": row["team_name"],
            "player_position": row["player_position"],
            "player_injury_risk": round(float(row["player_injury_risk"]) * 100),
            "player_relative_risk": float(row["player_relative_risk"]),
            "player_seasonal_injuries": row["player_seasonal_injuries"],
        }
        for row in rows
    ]


def get_trending_risk_players(session: Session, user_id: int | None = None) -> List[TrendingRiskPlayer]:
    if user_id is not None:
        rows = session.execute(
            text("""
                SELECT mv.* FROM mv_player_overview mv
                JOIN user_favourite uf
                  ON uf.player_id = mv.player_id AND uf.user_id = :uid
                WHERE mv.player_injury_trend > 30
                ORDER BY mv.player_injury_trend DESC
            """),
            {"uid": user_id}
        ).mappings().all()
    else:
        rows = session.execute(
            text("""
                SELECT * FROM mv_player_overview
                WHERE player_injury_trend > 30
                ORDER BY player_injury_trend DESC
            """)
        ).mappings().all()
    return [
        {
            "player_id": row["player_id"],
            "player_first_name": row["player_first_name"],
            "player_last_name": row["player_last_name"],
            "player_photo": row["player_photo"],
            "team_id": row["team_id"],
            "team_name": row["team_name"],
            "player_position": row["player_position"],
            "player_injury_trend": round(float(row["player_injury_trend"])),
            "player_seasonal_injuries": row["player_seasonal_injuries"],
        }
        for row in rows
    ]
