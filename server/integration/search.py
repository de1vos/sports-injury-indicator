from typing import List, Optional, TypedDict
from sqlalchemy import text, select as sa_select, distinct
from sqlmodel import Session
from database_init import PlayerInjury


class SearchPlayer(TypedDict):
    player_id: int
    team_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_name: str
    player_relative_risk: Optional[float]
    player_is_injured: bool


class SearchTeam(TypedDict):
    team_id: int
    team_name: str
    team_logo: str
    avg_risk_pct: Optional[int]
    squad_size: int


def get_search_players(session: Session) -> List[SearchPlayer]:
    rows = session.execute(text("SELECT * FROM mv_search_players ORDER BY player_last_name")).mappings().all()
    return [
        {
            "player_id": row["player_id"],
            "team_id": row["team_id"],
            "player_first_name": row["player_first_name"],
            "player_last_name": row["player_last_name"],
            "player_photo": row["player_photo"],
            "team_name": row["team_name"],
            "player_relative_risk": float(row["player_relative_risk"]) if row["player_relative_risk"] is not None else None,
            "player_is_injured": bool(row["player_is_injured"]),
        }
        for row in rows
    ]


def get_search_teams(session: Session) -> List[SearchTeam]:
    rows = session.execute(
        text("SELECT team_id, team_name, team_logo, avg_risk_pct, amount_of_players FROM mv_teams_overview ORDER BY team_name")
    ).mappings().all()

    return [
        {
            "team_id": row["team_id"],
            "team_name": row["team_name"],
            "team_logo": row["team_logo"],
            "avg_risk_pct": row["avg_risk_pct"],
            "squad_size": row["amount_of_players"],
        }
        for row in rows
    ]


def get_injury_regions(session: Session) -> List[str]:
    rows = session.execute(
        sa_select(distinct(PlayerInjury.player_injury_region))  # type: ignore[arg-type]
        .order_by(PlayerInjury.player_injury_region)  # type: ignore[attr-defined]
    ).all()

    return [row[0] for row in rows]
