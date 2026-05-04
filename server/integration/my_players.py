from typing import List, TypedDict
from uuid import UUID
from sqlalchemy import text, delete as sa_delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import Session
from database_init import UserFavourite


class FavouritePlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_id: int
    team_name: str
    player_position: str
    player_injury_risk: int
    player_relative_risk: float | None
    player_is_injured: bool
    player_injury_trend: int
    player_seasonal_injuries: int
    player_season_minutes: int


def get_favourite_players(user_id: UUID, session: Session) -> List[FavouritePlayer]:
    rows = session.execute(
        text("""
            SELECT mv.* FROM mv_player_overview mv
            JOIN user_favourite uf ON uf.player_id = mv.player_id AND uf.user_id = :uid
        """),
        {"uid": user_id}
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
            "player_relative_risk": float(row["player_relative_risk"]) if row["player_relative_risk"] is not None else None,
            "player_is_injured": float(row["player_injury_risk"]) >= 0.99,
            "player_injury_trend": round(float(row["player_injury_trend"])),
            "player_seasonal_injuries": row["player_seasonal_injuries"],
            "player_season_minutes": row["player_season_minutes"],
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
