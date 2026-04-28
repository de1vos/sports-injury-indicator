from typing import List, TypedDict
from sqlalchemy import text, select as sa_select, distinct
from sqlmodel import Session
from database_init import Team, PlayerInjury


class SearchPlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_name: str
    player_injury_risk: int


class SearchTeam(TypedDict):
    team_id: int
    team_name: str
    team_logo: str


def get_search_players(session: Session) -> List[SearchPlayer]:
    rows = session.execute(text("SELECT * FROM mv_search_players")).mappings().all()
    return [
        {
            "player_id": row["player_id"],
            "player_first_name": row["player_first_name"],
            "player_last_name": row["player_last_name"],
            "player_photo": row["player_photo"],
            "team_name": row["team_name"],
            "player_injury_risk": round(float(row["player_injury_risk"]) * 100),
        }
        for row in rows
    ]


def get_search_teams(session: Session) -> List[SearchTeam]:
    rows = session.execute(
        sa_select(  # type: ignore[call-overload, arg-type]
            Team.team_id,  # type: ignore[arg-type]
            Team.team_name,  # type: ignore[arg-type]
            Team.team_logo,  # type: ignore[arg-type]
        )
        .order_by(Team.team_name)  # type: ignore[attr-defined]
    ).all()

    return [
        {
            "team_id": row.team_id,
            "team_name": row.team_name,
            "team_logo": row.team_logo,
        }
        for row in rows
    ]


def get_injury_regions(session: Session) -> List[str]:
    rows = session.execute(
        sa_select(distinct(PlayerInjury.player_injury_region))  # type: ignore[arg-type]
        .order_by(PlayerInjury.player_injury_region)  # type: ignore[attr-defined]
    ).all()

    return [row[0] for row in rows]
