from typing import List, TypedDict
from sqlalchemy import func, select as sa_select
from sqlmodel import Session
from database_init import Team, Player, PlayerSeason, PlayerInjury
from integration.common import get_season_meta, get_active_player_ids_sq


class TeamOverview(TypedDict):
    team_id: int
    team_name: str
    team_logo: str | None
    amount_of_players: int
    average_risk_of_injury: int | None
    active_injuries: int
    percent_of_squad_injured: int


def get_teams_overview(session: Session) -> List[TeamOverview]:
    active_sq = get_active_player_ids_sq(session)
    player_stats_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            Player.team_id,
            func.count(Player.player_id).label("amount_of_players"),
            func.avg(Player.player_injury_risk).label("average_risk_of_injury"),
        )
        .join(active_sq, active_sq.c.player_id == Player.player_id)
        .where(Player.player_injury_risk < 0.99)  # type: ignore[arg-type]
        .group_by(Player.team_id)
        .subquery("player_stats")
    )

    current_season_year = get_season_meta(session).current_season_year
    injury_stats_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            Player.team_id,
            func.count(PlayerInjury.player_injury_id).label("active_injuries"),
        )
        .join(PlayerSeason, PlayerSeason.player_id == Player.player_id)  # type: ignore[arg-type]
        .join(PlayerInjury, PlayerInjury.player_season_id == PlayerSeason.player_season_id)  # type: ignore[arg-type]
        .where(PlayerSeason.player_season_year == current_season_year)  # type: ignore[arg-type]
        .where(PlayerInjury.player_injury_end == None)  # type: ignore[arg-type]
        .group_by(Player.team_id)
        .subquery("injury_stats")
    )

    stmt = (
        sa_select(  # type: ignore[call-overload, arg-type]
            Team.team_id,  # type: ignore[arg-type]
            Team.team_name,  # type: ignore[arg-type]
            Team.team_logo,  # type: ignore[arg-type]
            func.coalesce(player_stats_sq.c.amount_of_players, 0).label("amount_of_players"),
            player_stats_sq.c.average_risk_of_injury,
            func.coalesce(injury_stats_sq.c.active_injuries, 0).label("active_injuries"),
        )
        .outerjoin(player_stats_sq, player_stats_sq.c.team_id == Team.team_id)
        .outerjoin(injury_stats_sq, injury_stats_sq.c.team_id == Team.team_id)
        .order_by(Team.team_name)  # type: ignore[arg-type]
    )

    rows = session.execute(stmt).all()
    return [
        {
            "team_id": row.team_id,
            "team_name": row.team_name,
            "team_logo": row.team_logo,
            "amount_of_players": row.amount_of_players,
            "average_risk_of_injury": round(float(row.average_risk_of_injury) * 100) if row.average_risk_of_injury else None,
            "active_injuries": row.active_injuries,
            "percent_of_squad_injured": round(row.active_injuries / row.amount_of_players * 100) if row.amount_of_players else 0,
        }
        for row in rows
    ]
