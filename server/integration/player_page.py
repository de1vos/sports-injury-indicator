from typing import List, TypedDict
from sqlalchemy import func, select as sa_select, text
from sqlmodel import Session, select
from database_init import PlayerSeason, GraphData, PlayerInjury
from integration.common import get_season_meta


class TeamPlayerList(TypedDict):
    player_id: int | None
    player_first_name: str
    player_last_name: str
    player_injury_risk: int | str


class PlayerCard(TypedDict):
    player_first_name: str
    player_last_name: str
    player_age: int
    player_weight: str
    player_height: str
    player_photo: str
    player_position: str
    player_kit_number: int
    nation_name: str
    player_injury_risk: int
    player_injury_status: str
    player_injury_trend: int
    player_season_injuries: int
    player_season_minutes: int
    player_season_missed_games: int


class InjuryPredictionGraph(TypedDict):
    gw_1: int | str
    gw_2: int | str
    gw_3: int | str
    gw_4: int | str
    gw_5: int | str
    gw_6: int | str
    gw_7: int | str
    gw_8: int | str
    gw_9: int | str
    gw_10: int | str
    gw_11: int | str
    gw_12: int | str
    gw_13: int | str
    gw_14: int | str
    gw_15: int | str
    gw_16: int | str
    gw_17: int | str
    gw_18: int | str
    gw_19: int | str
    gw_20: int | str
    gw_21: int | str
    gw_22: int | str
    gw_23: int | str
    gw_24: int | str
    gw_25: int | str
    gw_26: int | str
    gw_27: int | str
    gw_28: int | str
    gw_29: int | str
    gw_30: int | str
    gw_31: int | str
    gw_32: int | str
    gw_33: int | str
    gw_34: int | str
    gw_35: int | str
    gw_36: int | str
    gw_37: int | str
    gw_38: int | str
    player_injury_trend: int


class SeasonStatistics(TypedDict):
    player_season_year: int
    player_season_appearances: int
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
    player_season_rating: float


class InjuryHistory(TypedDict):
    player_injury_type: str
    player_injury_region: str
    player_injury_start: str
    player_injury_end: str | None
    player_injury_severity: str
    player_injury_days_out: int


class InjuryAnalysis(TypedDict):
    player_total_injuries: int
    player_season_injuries: int
    player_total_games_missed: int
    player_days_since_injury: int | None
    player_average_games_played: float | None


def get_team_player_list(team_id: int, session: Session) -> List[TeamPlayerList]:
    rows = session.execute(
        text("SELECT * FROM mv_team_player_list WHERE team_id = :tid"),
        {"tid": team_id}
    ).mappings().all()
    return [
        {
            "player_id": row["player_id"],
            "player_first_name": row["player_first_name"],
            "player_last_name": row["player_last_name"],
            "player_injury_risk": "injured" if float(row["player_injury_risk"]) >= 0.99 else round(float(row["player_injury_risk"]) * 100),
        }
        for row in rows
    ]


def get_player_card(player_id: int, session: Session) -> PlayerCard | None:
    row = session.execute(
        text("SELECT * FROM mv_player_card WHERE player_id = :pid"),
        {"pid": player_id}
    ).mappings().one_or_none()
    if not row:
        return None
    injury_risk = float(row["player_injury_risk"])
    return {
        "player_first_name": row["player_first_name"],
        "player_last_name": row["player_last_name"],
        "player_age": row["player_age"],
        "player_weight": row["player_weight"],
        "player_height": row["player_height"],
        "player_photo": row["player_photo"],
        "player_position": row["player_position"],
        "player_kit_number": row["player_kit_number"],
        "nation_name": row["nation_name"],
        "player_injury_risk": round(injury_risk * 100),
        "player_injury_status": "injured" if injury_risk >= 0.99 else "available",
        "player_injury_trend": round(float(row["player_injury_trend"])) if row["player_injury_trend"] else 0,
        "player_season_injuries": row["player_season_injuries"],
        "player_season_minutes": row["player_season_minutes"],
        "player_season_missed_games": row["player_season_games_missed"],
    }


def get_injury_prediction_graph(player_id: int, session: Session) -> InjuryPredictionGraph | None:
    graph = session.exec(
        select(GraphData).where(GraphData.player_id == player_id)  # type: ignore[arg-type]
    ).first()

    if not graph:
        return None

    def gw_val(v) -> int | str:
        f = float(v)
        return "injured" if f >= 0.99 else round(f * 100)

    return {  # type: ignore[return-value]
        "gw_1": gw_val(graph.gw_1), "gw_2": gw_val(graph.gw_2), "gw_3": gw_val(graph.gw_3),
        "gw_4": gw_val(graph.gw_4), "gw_5": gw_val(graph.gw_5), "gw_6": gw_val(graph.gw_6),
        "gw_7": gw_val(graph.gw_7), "gw_8": gw_val(graph.gw_8), "gw_9": gw_val(graph.gw_9),
        "gw_10": gw_val(graph.gw_10), "gw_11": gw_val(graph.gw_11), "gw_12": gw_val(graph.gw_12),
        "gw_13": gw_val(graph.gw_13), "gw_14": gw_val(graph.gw_14), "gw_15": gw_val(graph.gw_15),
        "gw_16": gw_val(graph.gw_16), "gw_17": gw_val(graph.gw_17), "gw_18": gw_val(graph.gw_18),
        "gw_19": gw_val(graph.gw_19), "gw_20": gw_val(graph.gw_20), "gw_21": gw_val(graph.gw_21),
        "gw_22": gw_val(graph.gw_22), "gw_23": gw_val(graph.gw_23), "gw_24": gw_val(graph.gw_24),
        "gw_25": gw_val(graph.gw_25), "gw_26": gw_val(graph.gw_26), "gw_27": gw_val(graph.gw_27),
        "gw_28": gw_val(graph.gw_28), "gw_29": gw_val(graph.gw_29), "gw_30": gw_val(graph.gw_30),
        "gw_31": gw_val(graph.gw_31), "gw_32": gw_val(graph.gw_32), "gw_33": gw_val(graph.gw_33),
        "gw_34": gw_val(graph.gw_34), "gw_35": gw_val(graph.gw_35), "gw_36": gw_val(graph.gw_36),
        "gw_37": gw_val(graph.gw_37), "gw_38": gw_val(graph.gw_38),
        "graph_data_current_gw": get_season_meta(session).current_game_week,
        "player_injury_trend": round(float(graph.player_injury_trend)),
    }


def get_season_statistics(player_id: int, session: Session) -> List[SeasonStatistics]:
    seasons = session.exec(
        select(PlayerSeason)
        .where(PlayerSeason.player_id == player_id)  # type: ignore[arg-type]
        .order_by(PlayerSeason.player_season_year.desc())  # type: ignore[attr-defined]
    ).all()

    return [
        {
            "player_season_year": s.player_season_year,
            "player_season_appearances": s.player_season_appearences,
            "player_season_minutes": s.player_season_minutes,
            "player_season_fouls_drawn": s.player_season_fouls_drawn,
            "player_season_fouls_commited": s.player_season_fouls_commited,
            "player_season_duels_total": s.player_season_duels_total,
            "player_season_tackles": s.player_season_tackles,
            "player_season_yellow_cards": s.player_season_yellow_cards,
            "player_season_red_cards": s.player_season_red_cards,
            "player_season_goals": s.player_season_goals,
            "player_season_assists": s.player_season_assists,
            "player_season_dribbles_attempts": s.player_season_dribbles_attempts,
            "player_season_rating": float(s.player_season_rating),
        }
        for s in seasons
    ]


def get_injury_history(player_id: int, session: Session) -> List[InjuryHistory]:
    rows = session.execute(
        sa_select(  # type: ignore[call-overload, arg-type]
            PlayerInjury.player_injury_type,  # type: ignore[arg-type]
            PlayerInjury.player_injury_region,  # type: ignore[arg-type]
            PlayerInjury.player_injury_start,  # type: ignore[arg-type]
            PlayerInjury.player_injury_end,  # type: ignore[arg-type]
            PlayerInjury.player_injury_severity,  # type: ignore[arg-type]
            PlayerInjury.player_injury_days_out,  # type: ignore[arg-type]
        )
        .join(PlayerSeason, PlayerInjury.player_season_id == PlayerSeason.player_season_id)  # type: ignore[arg-type]
        .where(PlayerSeason.player_id == player_id)  # type: ignore[arg-type]
        .order_by(PlayerInjury.player_injury_start.desc())  # type: ignore[attr-defined]
    ).all()

    return [
        {
            "player_injury_type": row.player_injury_type,
            "player_injury_region": row.player_injury_region,
            "player_injury_start": str(row.player_injury_start),
            "player_injury_end": str(row.player_injury_end) if row.player_injury_end else None,
            "player_injury_severity": row.player_injury_severity,
            "player_injury_days_out": row.player_injury_days_out,
        }
        for row in rows
    ]


def get_injury_analysis(player_id: int, session: Session) -> InjuryAnalysis:
    row = session.execute(
        text("SELECT * FROM mv_injury_analysis WHERE player_id = :pid"),
        {"pid": player_id}
    ).mappings().one_or_none()

    avg_games_played = None
    if row:
        total_matches = row["player_season_appearences"] + row["season_games_missed"]
        if total_matches > 0:
            avg_games_played = round(row["player_season_minutes"] / total_matches, 1)

    return {
        "player_total_injuries": row["total_injuries"] if row else 0,
        "player_season_injuries": row["season_injuries"] if row else 0,
        "player_total_games_missed": row["total_games_missed"] if row else 0,
        "player_days_since_injury": row["days_since_injury"] if row else None,
        "player_average_games_played": avg_games_played,
    }
