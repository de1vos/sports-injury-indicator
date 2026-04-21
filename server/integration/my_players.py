from datetime import date
from typing import List, TypedDict
from sqlalchemy import func, select as sa_select
from sqlmodel import Session
from database_init import UserFavourite, Player, Team, PlayerSeason, PlayerInjury, GraphData


class FavouritePlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_id: int
    team_name: str
    player_position: str
    player_injury_trend: int
    player_seasonal_injuries: int


def get_favourite_players(user_id: int, session: Session) -> List[FavouritePlayer]:
    today = date.today()
    current_season_year = today.year if today.month >= 8 else today.year - 1

    latest_season_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerSeason.player_id,  # type: ignore[arg-type]
            func.max(PlayerSeason.player_season_year).label("latest_year"),
        )
        .group_by(PlayerSeason.player_id)
        .subquery("latest_season_sq")
    )

    seasonal_injuries_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerSeason.player_id,  # type: ignore[arg-type]
            func.count(PlayerInjury.player_injury_id).label("seasonal_injuries"),  # type: ignore[arg-type]
        )
        .join(PlayerInjury, PlayerInjury.player_season_id == PlayerSeason.player_season_id)  # type: ignore[arg-type]
        .where(PlayerSeason.player_season_year == current_season_year)
        .group_by(PlayerSeason.player_id)
        .subquery("seasonal_injuries_sq")
    )

    stmt = (
        sa_select(  # type: ignore[call-overload, arg-type]
            Player.player_id,  # type: ignore[arg-type]
            Player.player_first_name,  # type: ignore[arg-type]
            Player.player_last_name,  # type: ignore[arg-type]
            Player.player_photo,  # type: ignore[arg-type]
            Team.team_id,  # type: ignore[arg-type]
            Team.team_name,  # type: ignore[arg-type]
            Player.player_position,  # type: ignore[arg-type]
            GraphData.player_injury_trend,  # type: ignore[arg-type]
            func.coalesce(seasonal_injuries_sq.c.seasonal_injuries, 0).label("player_seasonal_injuries"),
        )
        .join(UserFavourite, UserFavourite.player_id == Player.player_id)  # type: ignore[arg-type]
        .join(Team, Team.team_id == Player.team_id)  # type: ignore[arg-type]
        .join(GraphData, GraphData.player_id == Player.player_id)  # type: ignore[arg-type]
        .outerjoin(latest_season_sq, latest_season_sq.c.player_id == Player.player_id)
        .outerjoin(seasonal_injuries_sq, seasonal_injuries_sq.c.player_id == Player.player_id)
        .where(UserFavourite.user_id == user_id)  # type: ignore[arg-type]
    )

    rows = session.execute(stmt).all()  # type: ignore[arg-type]
    return [
        {
            "player_id": row.player_id,
            "player_first_name": row.player_first_name,
            "player_last_name": row.player_last_name,
            "player_photo": row.player_photo,
            "team_id": row.team_id,
            "team_name": row.team_name,
            "player_position": row.player_position,
            "player_injury_trend": round(float(row.player_injury_trend)),
            "player_seasonal_injuries": row.player_seasonal_injuries,
        }
        for row in rows
    ]
