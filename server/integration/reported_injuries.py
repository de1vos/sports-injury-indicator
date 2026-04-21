from typing import List, TypedDict
from sqlalchemy import func, select as sa_select
from sqlmodel import Session
from database_init import Player, PlayerInjury, PlayerSeason, Team


class InjuryList(TypedDict):
    injury_date_start: str
    injury_date_end: str | None
    player_first_name: str
    player_last_name: str
    team_name: str
    player_injury_diagnosis: str
    player_injury_region: str
    player_injury_severity: str
    player_position: str
    player_injury_days_out: int


def get_reported_injuries(session: Session) -> List[InjuryList]:
    latest_season_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerSeason.player_id,  # type: ignore[arg-type]
            func.max(PlayerSeason.player_season_year).label("latest_year"),
        )
        .group_by(PlayerSeason.player_id)
        .subquery("latest_season_sq")
    )

    stmt = (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerInjury.player_injury_start,  # type: ignore[arg-type]
            PlayerInjury.player_injury_end,  # type: ignore[arg-type]
            Player.player_first_name,  # type: ignore[arg-type]
            Player.player_last_name,  # type: ignore[arg-type]
            Player.player_position,  # type: ignore[arg-type]
            Team.team_name,  # type: ignore[arg-type]
            PlayerInjury.player_injury_type,  # type: ignore[arg-type]
            PlayerInjury.player_injury_region,  # type: ignore[arg-type]
            PlayerInjury.player_injury_severity,  # type: ignore[arg-type]
            PlayerInjury.player_injury_days_out,  # type: ignore[arg-type]
        )
        .join(PlayerSeason, PlayerInjury.player_season_id == PlayerSeason.player_season_id)  # type: ignore[arg-type]
        .join(  # type: ignore[arg-type]
            latest_season_sq,
            (latest_season_sq.c.player_id == PlayerSeason.player_id) &
            (latest_season_sq.c.latest_year == PlayerSeason.player_season_year),
        )
        .join(Player, Player.player_id == PlayerSeason.player_id)  # type: ignore[arg-type]
        .join(Team, Team.team_id == Player.team_id)  # type: ignore[arg-type]
        .order_by(PlayerInjury.player_injury_start.desc())  # type: ignore[attr-defined]
    )

    rows = session.execute(stmt).all()  # type: ignore[arg-type]
    return [
        {
            "injury_date_start": str(row.player_injury_start),
            "injury_date_end": str(row.player_injury_end) if row.player_injury_end else None,
            "player_first_name": row.player_first_name,
            "player_last_name": row.player_last_name,
            "team_name": row.team_name,
            "player_injury_diagnosis": row.player_injury_type,
            "player_injury_region": row.player_injury_region,
            "player_injury_severity": row.player_injury_severity,
            "player_position": row.player_position,
            "player_injury_days_out": row.player_injury_days_out,
        }
        for row in rows
    ]
