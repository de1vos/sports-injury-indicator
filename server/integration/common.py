from sqlalchemy import func, select as sa_select
from sqlmodel import Session, select
from database_init import SeasonMeta, PlayerSeason


def get_season_meta(session: Session) -> SeasonMeta:
    row = session.exec(select(SeasonMeta)).first()
    if row is None:
        raise RuntimeError("season_meta table is empty — run ingest_predictions.py first")
    return row


def get_active_player_ids_sq(session: Session):
    yr = get_season_meta(session).current_season_year
    return (
        sa_select(PlayerSeason.player_id)  # type: ignore[arg-type]
        .group_by(PlayerSeason.player_id)
        .having(func.max(PlayerSeason.player_season_year) == yr)
        .subquery("active_players")
    )
