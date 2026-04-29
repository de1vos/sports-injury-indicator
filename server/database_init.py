import os
from datetime import date, time
from decimal import Decimal
from pathlib import Path
from typing import ClassVar, List, Optional
from dotenv import load_dotenv
from sqlalchemy import CheckConstraint, Identity, Column, Time, Numeric
from sqlmodel import Field, Relationship, SQLModel, create_engine

load_dotenv(Path(__file__).resolve().parent / ".env")

_db_url = os.environ["DATABASE_URL"]
if "sslmode" not in _db_url:
    _db_url += ("&" if "?" in _db_url else "?") + "sslmode=require"

engine = create_engine(_db_url, echo=False)

# 1. Nation
class Nation(SQLModel, table=True):
    nation_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    nation_name: str = Field(max_length=100)
    nation_flag_image: str = Field(max_length=500)

    players: List["Player"] = Relationship(back_populates="nation")

# 1b. SeasonMeta
class SeasonMeta(SQLModel, table=True):
    __tablename__: ClassVar[str] = "season_meta"
    id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    current_season_year: int
    current_game_week: str = Field(max_length=10)

    __table_args__: ClassVar[tuple] = (
        CheckConstraint(
            "current_game_week IN (" + ', '.join(f"'gw{i}'" for i in range(1, 39)) + ")",
            name='chk_season_meta_game_week'
        ),
    )

# 2. Team
class Team(SQLModel, table=True):
    team_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(start=1, always=False)]
    )
    team_name: str = Field(max_length=200)
    team_logo: str = Field(max_length=500)
    team_color: str = Field(max_length=10)

    players: List["Player"] = Relationship(back_populates="team")
    home_matches: List["Match"] = Relationship(
        back_populates="home_team",
        sa_relationship_kwargs={"foreign_keys": "[Match.home_team_id]"}
    )
    away_matches: List["Match"] = Relationship(
        back_populates="away_team",
        sa_relationship_kwargs={"foreign_keys": "[Match.away_team_id]"}
    )

# 3. AppUser
class AppUser(SQLModel, table=True):
    __tablename__: ClassVar[str] = "app_user"
    user_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    user_mail: str = Field(max_length=200)
    user_password: str = Field(max_length=500)

    favourites: List["UserFavourite"] = Relationship(back_populates="user")

# 4. Match
class Match(SQLModel, table=True):
    __tablename__: ClassVar[str] = "match"
    match_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    home_team_id: int = Field(foreign_key="team.team_id")
    away_team_id: int = Field(foreign_key="team.team_id")
    match_date: date
    match_time: Optional[time] = Field(
        default=None,
        sa_column=Column(Time(timezone=False))
    )
    match_fixture_id: int
    match_game_week: str = Field(max_length=10)
    match_venue: str = Field(max_length=200)
    match_goals_home: int
    match_goals_away: int
    home_avg_injury_risk: Decimal = Field(sa_column=Column(Numeric(4, 3), CheckConstraint('home_avg_injury_risk BETWEEN 0 AND 1'), nullable=False))
    away_avg_injury_risk: Decimal = Field(sa_column=Column(Numeric(4, 3), CheckConstraint('away_avg_injury_risk BETWEEN 0 AND 1'), nullable=False))
    match_is_played: bool

    home_team: Optional["Team"] = Relationship(
        back_populates="home_matches",
        sa_relationship_kwargs={"foreign_keys": "[Match.home_team_id]"}
    )
    away_team: Optional["Team"] = Relationship(
        back_populates="away_matches",
        sa_relationship_kwargs={"foreign_keys": "[Match.away_team_id]"}
    )

# 6. Player
class Player(SQLModel, table=True):
    player_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(start=1, always=False)]
    )
    team_id: int = Field(foreign_key="team.team_id")
    nation_id: int = Field(foreign_key="nation.nation_id")
    player_first_name: str = Field(max_length=100)
    player_last_name: str = Field(max_length=100)
    player_position: str = Field(max_length=50)
    player_age: int
    player_height: str = Field(max_length=50)
    player_weight: str = Field(max_length=50)
    player_photo: str = Field(max_length=500)
    player_kit_number: int
    player_injury_risk: Decimal = Field(sa_column=Column(Numeric(4, 3), CheckConstraint('player_injury_risk BETWEEN 0 AND 1'), nullable=False))
    player_risk_factor_1: str = Field(max_length=100)
    player_risk_factor_2: str = Field(max_length=100)
    player_risk_factor_3: str = Field(max_length=100)

    team: Optional["Team"] = Relationship(back_populates="players")
    nation: Optional["Nation"] = Relationship(back_populates="players")
    seasons: List["PlayerSeason"] = Relationship(back_populates="player")
    graph_data: Optional["GraphData"] = Relationship(back_populates="player")
    favourited_by: List["UserFavourite"] = Relationship(back_populates="player")

# 7. PlayerInjury
class PlayerInjury(SQLModel, table=True):
    __tablename__: ClassVar[str] = "player_injury"
    player_injury_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_season_id: int = Field(foreign_key="player_season.player_season_id")
    player_injury_type: str = Field(max_length=200)
    player_injury_days_out: int
    player_injury_start: date
    player_injury_end: Optional[date] = Field(default=None)
    player_injury_severity: str = Field(max_length=50)
    player_injury_region: str = Field(max_length=50)

    season: Optional["PlayerSeason"] = Relationship(back_populates="injuries")

# 8. PlayerSeason
class PlayerSeason(SQLModel, table=True):
    __tablename__: ClassVar[str] = "player_season"
    player_season_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: int = Field(foreign_key="player.player_id")
    player_season_year: int
    player_season_appearences: int
    player_season_minutes: int
    player_season_fouls_drawn: int
    player_season_fouls_commited: int
    player_season_duels_total: int
    player_season_tackles: int
    player_season_yellow_cards: int
    player_season_red_cards: int
    player_season_goals: int
    player_season_assists: int
    player_season_dribbles_attempts: int
    player_season_games_missed: int
    player_season_rating: Decimal = Field(sa_column=Column(Numeric(4, 2), nullable=False))

    player: Optional["Player"] = Relationship(back_populates="seasons")
    injuries: List["PlayerInjury"] = Relationship(back_populates="season")

# 9. UserFavourite
class UserFavourite(SQLModel, table=True):
    __tablename__: ClassVar[str] = "user_favourite"
    user_favourite_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: int = Field(foreign_key="player.player_id")
    user_id: int = Field(foreign_key="app_user.user_id")

    player: Optional["Player"] = Relationship(back_populates="favourited_by")
    user: Optional["AppUser"] = Relationship(back_populates="favourites")

# 10. GraphData
class GraphData(SQLModel, table=True):
    __tablename__: ClassVar[str] = "graph_data"
    graph_data_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: int = Field(foreign_key="player.player_id")
    player_injury_trend: Decimal = Field(sa_column=Column(Numeric(5, 2), nullable=False))

    __table_args__: ClassVar[tuple] = (
        CheckConstraint(
            ' AND '.join(f'gw_{i} BETWEEN 0 AND 1' for i in range(1, 39)),
            name='chk_gw_risk_range'
        ),
    )

    # Mapping all 38 weeks
    gw_1: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_2: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_3: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_4: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_5: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_6: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_7: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_8: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_9: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_10: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_11: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_12: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_13: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_14: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_15: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_16: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_17: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_18: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_19: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_20: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_21: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_22: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_23: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_24: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_25: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_26: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_27: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_28: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_29: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_30: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_31: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_32: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_33: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_34: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_35: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_36: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_37: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))
    gw_38: Decimal = Field(sa_column=Column(Numeric(4, 3), nullable=False))

    player: Optional["Player"] = Relationship(back_populates="graph_data")

if __name__ == "__main__":
    from sqlalchemy import text
    print("Dropping all tables...")
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.commit()
    print("Recreating all tables...")
    SQLModel.metadata.create_all(engine)
    print("Done.")
