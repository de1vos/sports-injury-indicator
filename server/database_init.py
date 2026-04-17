from datetime import date, time
from decimal import Decimal
from typing import ClassVar, List, Optional
from sqlalchemy import Identity, Column, Time, Numeric
from sqlmodel import Field, Relationship, SQLModel, create_engine


# Testing engine for developer
engine = create_engine('postgresql+psycopg://max@localhost:5432/test', echo=False)

# 1. Nation
class Nation(SQLModel, table=True):
    nation_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    nation_name: str = Field(max_length=100)
    nation_flag_image: Optional[str] = Field(default=None, max_length=500)

    players: List["Player"] = Relationship(back_populates="nation")

# 2. Team
class Team(SQLModel, table=True):
    team_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    team_name: str = Field(max_length=200)
    team_logo: Optional[str] = Field(default=None, max_length=500)
    team_color: Optional[str] = Field(default=None, max_length=10)

    players: List["Player"] = Relationship(back_populates="team")
    home_matches: List["PastMatch"] = Relationship(
        back_populates="home_team",
        sa_relationship_kwargs={"foreign_keys": "[PastMatch.home_team_id]"}
    )
    away_matches: List["PastMatch"] = Relationship(
        back_populates="away_team",
        sa_relationship_kwargs={"foreign_keys": "[PastMatch.away_team_id]"}
    )
    home_next_matches: List["NextMatch"] = Relationship(
        back_populates="home_team",
        sa_relationship_kwargs={"foreign_keys": "[NextMatch.home_team_id]"}
    )
    away_next_matches: List["NextMatch"] = Relationship(
        back_populates="away_team",
        sa_relationship_kwargs={"foreign_keys": "[NextMatch.away_team_id]"}
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

# 4. PastMatch
class PastMatch(SQLModel, table=True):
    __tablename__: ClassVar[str] = "past_match"
    past_match_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    away_team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    home_team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    past_match_date: date
    past_match_time: Optional[time] = Field(
        default=None,
        sa_column=Column(Time(timezone=False))
    )
    past_match_goals_home: Optional[int] = Field(default=None)
    past_match_goals_away: Optional[int] = Field(default=None)
    past_match_fixture_id: Optional[int] = Field(default=None)
    past_match_venue: Optional[str] = Field(default=None, max_length=200)

    home_team: "Team" = Relationship(
        back_populates="home_matches",
        sa_relationship_kwargs={"foreign_keys": "[PastMatch.home_team_id]"}
    )
    away_team: "Team" = Relationship(
        back_populates="away_matches",
        sa_relationship_kwargs={"foreign_keys": "[PastMatch.away_team_id]"}
    )

# 5. NextMatch
class NextMatch(SQLModel, table=True):
    __tablename__: ClassVar[str] = "next_match"
    next_match_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    away_team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    home_team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    next_match_date: date
    next_match_time: Optional[time] = Field(
        default=None,
        sa_column=Column(Time(timezone=False))
    )
    next_match_fixture_id: Optional[int] = Field(default=None)
    next_match_venue: Optional[str] = Field(default=None, max_length=200)

    home_team: "Team" = Relationship(
        back_populates="home_next_matches",
        sa_relationship_kwargs={"foreign_keys": "[NextMatch.home_team_id]"}
    )
    away_team: "Team" = Relationship(
        back_populates="away_next_matches",
        sa_relationship_kwargs={"foreign_keys": "[NextMatch.away_team_id]"}
    )

# 6. Player
class Player(SQLModel, table=True):
    player_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    nation_id: Optional[int] = Field(default=None, foreign_key="nation.nation_id")
    player_first_name: str = Field(max_length=100)
    player_last_name: str = Field(max_length=100)
    player_age: Optional[int] = Field(default=None)
    player_height: Optional[str] = Field(default=None, max_length=50)
    player_weight: Optional[str] = Field(default=None, max_length=50)
    player_photo: Optional[str] = Field(default=None, max_length=500)
    player_kit_number: Optional[int] = Field(default=None)
    player_injury_risk: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    player_risk_factor_1: Optional[str] = Field(default=None, max_length=50)
    player_risk_factor_2: Optional[str] = Field(default=None, max_length=50)
    player_risk_factor_3: Optional[str] = Field(default=None, max_length=50)

    team: Optional["Team"] = Relationship(back_populates="players")
    nation: Optional["Nation"] = Relationship(back_populates="players")
    injuries: List["PlayerInjury"] = Relationship(back_populates="player")
    seasons: List["PlayerSeason"] = Relationship(back_populates="player")
    graph_data: Optional["GraphData"] = Relationship(back_populates="player")
    favourited_by: List["UserFavourite"] = Relationship(back_populates="player")

# 6. PlayerInjury
class PlayerInjury(SQLModel, table=True):
    __tablename__: ClassVar[str] = "player_injury"
    player_injury_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")
    player_injury_type: str = Field(max_length=200)
    player_injury_days_out: Optional[int] = Field(default=None)
    player_injury_start: date
    player_injury_end: Optional[date] = Field(default=None)
    player_injury_severity: Optional[str] = Field(default=None, max_length=50)
    player_injury_region: Optional[str] = Field(default=None, max_length=50)

    player: Optional["Player"] = Relationship(back_populates="injuries")

# 7. PlayerSeason
class PlayerSeason(SQLModel, table=True):
    __tablename__: ClassVar[str] = "player_season"
    player_season_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")
    player_season_year: int
    player_season_appearences: Optional[int] = Field(default=None)
    player_season_minutes: Optional[int] = Field(default=None)
    player_season_fouls_drawn: Optional[int] = Field(default=None)
    player_season_duels_total: Optional[int] = Field(default=None)
    player_season_tackles: Optional[int] = Field(default=None)
    player_season_dribbles_attempts: Optional[int] = Field(default=None)
    player_season_games_missed: Optional[int] = Field(default=None)

    player: Optional["Player"] = Relationship(back_populates="seasons")

# 8. UserFavourite
class UserFavourite(SQLModel, table=True):
    __tablename__: ClassVar[str] = "user_favourite"
    user_favourite_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")
    user_id: Optional[int] = Field(default=None, foreign_key="app_user.user_id")

    player: Optional["Player"] = Relationship(back_populates="favourited_by")
    user: Optional["AppUser"] = Relationship(back_populates="favourites")

# 9. GraphData
class GraphData(SQLModel, table=True):
    __tablename__: ClassVar[str] = "graph_data"
    graph_data_id: Optional[int] = Field(
        default=None, 
        primary_key=True, 
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")

    # Mapping all 38 weeks
    gw_1: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_2: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_3: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_4: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_5: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_6: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_7: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_8: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_9: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_10: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_11: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_12: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_13: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_14: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_15: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_16: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_17: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_18: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_19: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_20: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_21: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_22: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_23: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_24: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_25: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_26: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_27: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_28: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_29: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_30: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_31: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_32: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_33: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_34: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_35: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_36: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_37: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))
    gw_38: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(2, 2)))

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
