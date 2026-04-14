from datetime import date, time
from decimal import Decimal
from typing import List, Optional
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
    nation_name: Optional[str] = Field(default=None, max_length=100)
    nation_flag_image: Optional[str] = Field(default=None, max_length=500)

    players: List["Player"] = Relationship(back_populates="nation")

# 2. Team
class Team(SQLModel, table=True):
    team_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    team_name: Optional[str] = Field(default=None, max_length=200)
    team_logo: Optional[str] = Field(default=None, max_length=500)

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
    user_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    user_mail: Optional[str] = Field(default=None, max_length=200)
    user_password: Optional[str] = Field(default=None, max_length=500)

    favourites: List["UserFavourite"] = Relationship(back_populates="user")

# 4. Match
class Match(SQLModel, table=True):
    match_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    away_team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    home_team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    match_date: Optional[date] = Field(default=None)
    match_time: Optional[time] = Field(
        default=None,
        sa_column=Column(Time(timezone=False))
    )
    match_goals_home: Optional[int] = Field(default=None)
    match_goals_away: Optional[int] = Field(default=None)

    home_team: "Team" = Relationship(
        back_populates="home_matches",
        sa_relationship_kwargs={"foreign_keys": "[Match.home_team_id]"}
    )
    away_team: "Team" = Relationship(
        back_populates="away_matches",
        sa_relationship_kwargs={"foreign_keys": "[Match.away_team_id]"}
    )

# 5. Player
class Player(SQLModel, table=True):
    player_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    team_id: Optional[int] = Field(default=None, foreign_key="team.team_id")
    nation_id: Optional[int] = Field(default=None, foreign_key="nation.nation_id")
    player_first_name: Optional[str] = Field(default=None, max_length=100)
    player_last_name: Optional[str] = Field(default=None, max_length=100)
    player_age: Optional[int] = Field(default=None)
    player_height: Optional[str] = Field(default=None, max_length=50)
    player_weight: Optional[str] = Field(default=None, max_length=50)

    team: Optional["Team"] = Relationship(back_populates="players")
    nation: Optional["Nation"] = Relationship(back_populates="players")
    injuries: List["PlayerInjury"] = Relationship(back_populates="player")
    seasons: List["PlayerSeason"] = Relationship(back_populates="player")
    graph_data: Optional["GraphData"] = Relationship(back_populates="player")
    favourited_by: List["UserFavourite"] = Relationship(back_populates="player")

# 6. PlayerInjury
class PlayerInjury(SQLModel, table=True):
    player_injury_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")
    player_injury_reason: Optional[str] = Field(default=None, max_length=200)
    player_injury_games_missed: Optional[int] = Field(default=None)
    player_injury_start: Optional[date] = Field(default=None)
    player_injury_end: Optional[date] = Field(default=None)

    player: Optional["Player"] = Relationship(back_populates="injuries")

# 7. PlayerSeason
class PlayerSeason(SQLModel, table=True):
    player_season_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")
    player_season_year: Optional[int] = Field(default=None)
    player_season_games_played: Optional[int] = Field(default=None)
    player_season_minutes_played: Optional[int] = Field(default=None)
    player_season_fouls_drawn: Optional[int] = Field(default=None)              # fouls_against
    player_season_aerials_total: Optional[int] = Field(default=None)            # aerial_duels
    player_season_tackles: Optional[int] = Field(default=None)
    player_season_dribbles_attempted: Optional[int] = Field(default=None)

    player: Optional["Player"] = Relationship(back_populates="seasons")

# 8. UserFavourite
class UserFavourite(SQLModel, table=True):
    user_favourite_id: Optional[int] = Field(
        default=None,
        primary_key=True,
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")
    user_id: Optional[int] = Field(default=None, foreign_key="appuser.user_id")

    player: Optional["Player"] = Relationship(back_populates="favourited_by")
    user: Optional["AppUser"] = Relationship(back_populates="favourites")

# 9. GraphData
class GraphData(SQLModel, table=True):
    graph_data_id: Optional[int] = Field(
        default=None, 
        primary_key=True, 
        sa_column_args=[Identity(always=True)]
    )
    player_id: Optional[int] = Field(default=None, foreign_key="player.player_id")

    # Mapping all 38 weeks
    week_1: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_2: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_3: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_4: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_5: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_6: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_7: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_8: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_9: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_10: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_11: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_12: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_13: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_14: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_15: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_16: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_17: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_18: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_19: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_20: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_21: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_22: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_23: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_24: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_25: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_26: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_27: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_28: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_29: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_30: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_31: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_32: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_33: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_34: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_35: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_36: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_37: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))
    week_38: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 5)))

    player: Optional["Player"] = Relationship(back_populates="graph_data")

SQLModel.metadata.create_all(engine)
