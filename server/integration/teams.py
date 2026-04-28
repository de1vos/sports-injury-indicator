from typing import List, TypedDict
from sqlalchemy import text
from sqlmodel import Session


class TeamOverview(TypedDict):
    team_id: int
    team_name: str
    team_logo: str | None
    amount_of_players: int
    average_risk_of_injury: int | None
    active_injuries: int
    percent_of_squad_injured: int


def get_teams_overview(session: Session) -> List[TeamOverview]:
    rows = session.execute(text("SELECT * FROM mv_teams_overview")).mappings().all()
    return [
        {
            "team_id": row["team_id"],
            "team_name": row["team_name"],
            "team_logo": row["team_logo"],
            "amount_of_players": row["amount_of_players"],
            "average_risk_of_injury": round(float(row["average_risk_of_injury"]) * 100) if row["average_risk_of_injury"] else None,
            "active_injuries": row["active_injuries"],
            "percent_of_squad_injured": round(row["active_injuries"] / row["amount_of_players"] * 100) if row["amount_of_players"] else 0,
        }
        for row in rows
    ]
