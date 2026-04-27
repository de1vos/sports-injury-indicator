from datetime import date
from typing import List, TypedDict
from sqlalchemy import func, select as sa_select
from sqlalchemy.orm import aliased
from sqlmodel import Session
from database_init import Match, Team, Player, PlayerSeason, PlayerInjury, GraphData, UserFavourite


def _current_season_year() -> int:
    today = date.today()
    return today.year if today.month >= 8 else today.year - 1


def _active_player_ids_sq():
    """Players whose latest player_season row is the current PL season."""
    yr = _current_season_year()
    return (
        sa_select(PlayerSeason.player_id)  # type: ignore[arg-type]
        .group_by(PlayerSeason.player_id)
        .having(func.max(PlayerSeason.player_season_year) == yr)
        .subquery("active_players")
    )


class GameWeekMatches(TypedDict):
    home_team_name: str
    away_team_name: str
    home_team_logo: str
    away_team_logo: str
    home_team_goals: int | None
    away_team_goals: int | None
    home_average_injury_risk: int | None
    away_average_injury_risk: int | None
    match_time: str | None
    match_date: str
    match_is_played: bool


class HighRiskPlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_id: int
    team_name: str
    player_position: str
    player_injury_risk: int
    player_seasonal_injuries: int


class TrendingRiskPlayer(TypedDict):
    player_id: int
    player_first_name: str
    player_last_name: str
    player_photo: str
    team_id: int
    team_name: str
    player_position: str
    player_injury_trend: int
    player_seasonal_injuries: int


def _seasonal_injuries_sq():
    latest_season_sq = (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerSeason.player_id,  # type: ignore[arg-type]
            func.max(PlayerSeason.player_season_year).label("latest_year"),
        )
        .group_by(PlayerSeason.player_id)
        .subquery("latest_season_sq")
    )

    return (
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerSeason.player_id,  # type: ignore[arg-type]
            func.count(PlayerInjury.player_injury_id).label("seasonal_injuries"),  # type: ignore[arg-type]
        )
        .join(  # type: ignore[arg-type]
            latest_season_sq,
            (latest_season_sq.c.player_id == PlayerSeason.player_id) &
            (latest_season_sq.c.latest_year == PlayerSeason.player_season_year),
        )
        .join(PlayerInjury, PlayerInjury.player_season_id == PlayerSeason.player_season_id)  # type: ignore[arg-type]
        .group_by(PlayerSeason.player_id)
        .subquery("seasonal_injuries")
    )


def get_game_week_matches(game_week: str, session: Session) -> List[GameWeekMatches]:
    HomeTeam = aliased(Team)
    AwayTeam = aliased(Team)

    stmt = (
        sa_select(  # type: ignore[call-overload, arg-type]
            HomeTeam.team_name.label("home_team_name"),  # type: ignore[attr-defined]
            HomeTeam.team_logo.label("home_team_logo"),  # type: ignore[attr-defined]
            AwayTeam.team_name.label("away_team_name"),  # type: ignore[attr-defined]
            AwayTeam.team_logo.label("away_team_logo"),  # type: ignore[attr-defined]
            Match.match_goals_home,  # type: ignore[arg-type]
            Match.match_goals_away,  # type: ignore[arg-type]
            Match.home_avg_injury_risk,  # type: ignore[arg-type]
            Match.away_avg_injury_risk,  # type: ignore[arg-type]
            Match.match_time,  # type: ignore[arg-type]
            Match.match_date,  # type: ignore[arg-type]
            Match.match_is_played,  # type: ignore[arg-type]
        )
        .join(HomeTeam, Match.home_team_id == HomeTeam.team_id) # type: ignore[arg-type]
        .join(AwayTeam, Match.away_team_id == AwayTeam.team_id) # type: ignore[arg-type]
        .where(Match.match_game_week == game_week)  # type: ignore[arg-type]
        .order_by(Match.match_date, Match.match_time)  # type: ignore[arg-type]
    )

    rows = session.execute(stmt).all()
    return [
        {
            "home_team_name": row.home_team_name,
            "away_team_name": row.away_team_name,
            "home_team_logo": row.home_team_logo,
            "away_team_logo": row.away_team_logo,
            "home_team_goals": row.match_goals_home if row.match_is_played else None,
            "away_team_goals": row.match_goals_away if row.match_is_played else None,
            "home_average_injury_risk": None if row.match_is_played else round(float(row.home_avg_injury_risk) * 100),
            "away_average_injury_risk": None if row.match_is_played else round(float(row.away_avg_injury_risk) * 100),
            "match_time": str(row.match_time) if row.match_time else None,
            "match_date": str(row.match_date),
            "match_is_played": row.match_is_played,
        }
        for row in rows
    ]


def get_high_risk_players(session: Session, user_id: int | None = None) -> List[HighRiskPlayer]:
    inj_sq = _seasonal_injuries_sq()
    active_sq = _active_player_ids_sq()

    stmt = (
        sa_select(  # type: ignore[call-overload, arg-type]
            Player.player_id,  # type: ignore[arg-type]
            Player.player_first_name,  # type: ignore[arg-type]
            Player.player_last_name,  # type: ignore[arg-type]
            Player.player_photo,  # type: ignore[arg-type]
            Team.team_id,  # type: ignore[arg-type]
            Team.team_name,  # type: ignore[arg-type]
            Player.player_position,  # type: ignore[arg-type]
            Player.player_injury_risk,  # type: ignore[arg-type]
            func.coalesce(inj_sq.c.seasonal_injuries, 0).label("player_seasonal_injuries"),
        )
        .join(Team, Player.team_id == Team.team_id)
        .join(active_sq, active_sq.c.player_id == Player.player_id)
        .outerjoin(inj_sq, inj_sq.c.player_id == Player.player_id)
        .where(Player.player_injury_risk < 0.99)  # type: ignore[arg-type]
        .order_by(Player.player_injury_risk.desc())  # type: ignore[attr-defined]
    )

    if user_id is not None:
        stmt = stmt.join(UserFavourite, (UserFavourite.player_id == Player.player_id) & (UserFavourite.user_id == user_id))  # type: ignore[arg-type]
    else:
        stmt = stmt.where(Player.player_injury_risk > 0.50)  # type: ignore[arg-type]

    rows = session.execute(stmt).all()
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
            "player_seasonal_injuries": row.player_seasonal_injuries,
        }
        for row in rows
    ]


def get_trending_risk_players(session: Session, user_id: int | None = None) -> List[TrendingRiskPlayer]:
    inj_sq = _seasonal_injuries_sq()

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
            func.coalesce(inj_sq.c.seasonal_injuries, 0).label("player_seasonal_injuries"),
        )
        .join(Team, Player.team_id == Team.team_id)
        .join(GraphData, GraphData.player_id == Player.player_id)
        .outerjoin(inj_sq, inj_sq.c.player_id == Player.player_id)
        .where(GraphData.player_injury_trend > 30)  # type: ignore[arg-type]
        .order_by(GraphData.player_injury_trend.desc())  # type: ignore[attr-defined]
    )

    if user_id is not None:
        stmt = stmt.join(UserFavourite, (UserFavourite.player_id == Player.player_id) & (UserFavourite.user_id == user_id))  # type: ignore[arg-type]

    rows = session.execute(stmt).all()
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
