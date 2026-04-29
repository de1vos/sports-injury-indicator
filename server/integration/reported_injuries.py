from typing import List, TypedDict
from sqlalchemy import text
from sqlmodel import Session


class InjuryList(TypedDict):
    injury_date_start: str
    injury_date_end: str | None
    player_first_name: str
    player_last_name: str
    player_photo: str | None
    team_name: str
    player_injury_diagnosis: str
    player_injury_region: str
    player_injury_severity: str
    player_position: str
    player_injury_days_out: int


def get_reported_injuries(session: Session) -> List[InjuryList]:
    rows = session.execute(text("SELECT * FROM mv_reported_injuries")).mappings().all()
    return [
        {
            "injury_date_start": str(row["player_injury_start"]),
            "injury_date_end": str(row["player_injury_end"]) if row["player_injury_end"] else None,
            "player_first_name": row["player_first_name"],
            "player_last_name": row["player_last_name"],
            "player_photo": row["player_photo"],
            "team_name": row["team_name"],
            "player_injury_diagnosis": row["player_injury_type"],
            "player_injury_region": row["player_injury_region"],
            "player_injury_severity": row["player_injury_severity"],
            "player_position": row["player_position"],
            "player_injury_days_out": row["player_injury_days_out"],
        }
        for row in rows
    ]
