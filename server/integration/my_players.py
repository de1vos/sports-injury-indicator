from typing import List, TypedDict
from uuid import UUID
from sqlalchemy import func, select as sa_select, delete as sa_delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session
from database_init import UserFavourite, Player, Team, PlayerSeason, PlayerInjury, GraphData
from integration.common import get_season_meta


class FavouritePlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_id: int
    team_name: str
    player_position: str
    player_injury_risk: int
    player_is_injured: bool
    player_injury_trend: int
    player_seasonal_injuries: int
    player_season_minutes: int


def get_favourite_players(user_id: UUID, session: Session) -> List[FavouritePlayer]:
    current_season_year = get_season_meta(session).current_season_year

    latest_season_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerSeason.player_id,  # type: ignore[arg-type]
            func.max(PlayerSeason.player_season_year).label("latest_year"),
        )
        .group_by(PlayerSeason.player_id)
        .subquery("latest_season_sq")
    )

    latest_ps_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerSeason.player_id,  # type: ignore[arg-type]
            PlayerSeason.player_season_minutes,  # type: ignore[arg-type]
        )
        .join(
            latest_season_sq,
            (latest_season_sq.c.player_id == PlayerSeason.player_id) &
            (latest_season_sq.c.latest_year == PlayerSeason.player_season_year),
        )
        .subquery("latest_ps_sq")
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
            Player.player_injury_risk,  # type: ignore[arg-type]
            Team.team_id,  # type: ignore[arg-type]
            Team.team_name,  # type: ignore[arg-type]
            Player.player_position,  # type: ignore[arg-type]
            GraphData.player_injury_trend,  # type: ignore[arg-type]
            func.coalesce(seasonal_injuries_sq.c.seasonal_injuries, 0).label("player_seasonal_injuries"),
            func.coalesce(latest_ps_sq.c.player_season_minutes, 0).label("player_season_minutes"),
        )
        .join(UserFavourite, UserFavourite.player_id == Player.player_id)  # type: ignore[arg-type]
        .join(Team, Team.team_id == Player.team_id)  # type: ignore[arg-type]
        .join(GraphData, GraphData.player_id == Player.player_id)  # type: ignore[arg-type]
        .outerjoin(seasonal_injuries_sq, seasonal_injuries_sq.c.player_id == Player.player_id)
        .outerjoin(latest_ps_sq, latest_ps_sq.c.player_id == Player.player_id)
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
            "player_injury_risk": round(float(row.player_injury_risk) * 100),
            "player_is_injured": float(row.player_injury_risk) >= 0.99,
            "player_injury_trend": round(float(row.player_injury_trend)),
            "player_seasonal_injuries": row.player_seasonal_injuries,
            "player_season_minutes": row.player_season_minutes,
        }
        for row in rows
    ]


def add_favourite(user_id: UUID, player_id: int, session: Session) -> None:
    session.execute(
        pg_insert(UserFavourite.__table__)
        .values(user_id=user_id, player_id=player_id)
        .on_conflict_do_nothing()
    )
    session.commit()


def remove_favourite(user_id: UUID, player_id: int, session: Session) -> None:
    session.execute(
        sa_delete(UserFavourite.__table__).where(
            UserFavourite.__table__.c.user_id == user_id,
            UserFavourite.__table__.c.player_id == player_id,
        )
    )
    session.commit()
