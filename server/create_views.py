from sqlalchemy import text
from sqlalchemy.engine import Connection


def create_all_views(conn: Connection) -> None:
    _create_mv_game_week_matches(conn)
    _create_mv_teams_overview(conn)
    _create_mv_player_overview(conn)
    _create_mv_injury_history(conn)
    _create_mv_search_players(conn)
    _create_mv_team_player_list(conn)
    _create_mv_player_card(conn)
    _create_mv_injury_analysis(conn)
    _create_mv_reported_injuries(conn)
    print("  all materialized views created")


def _create_mv_game_week_matches(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_game_week_matches AS
        SELECT
            ht.team_name   AS home_team_name,
            ht.team_logo   AS home_team_logo,
            at.team_name   AS away_team_name,
            at.team_logo   AS away_team_logo,
            m.match_goals_home,
            m.match_goals_away,
            m.home_avg_injury_risk,
            m.away_avg_injury_risk,
            m.match_time,
            m.match_date,
            m.match_is_played
        FROM match m
        JOIN team ht ON ht.team_id = m.home_team_id
        JOIN team at ON at.team_id = m.away_team_id
        JOIN season_meta sm ON m.match_game_week = sm.current_game_week
        ORDER BY m.match_date, m.match_time
    """))


def _create_mv_teams_overview(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_teams_overview AS
        SELECT
            t.team_id,
            t.team_name,
            t.team_logo,
            COALESCE(ps.amount_of_players, 0)  AS amount_of_players,
            ps.average_risk_of_injury,
            COALESCE(inj.active_injuries, 0)   AS active_injuries
        FROM team t
        JOIN (
            SELECT home_team_id AS team_id FROM match
            UNION
            SELECT away_team_id AS team_id FROM match
        ) pl_teams ON pl_teams.team_id = t.team_id
        LEFT JOIN (
            SELECT
                p.team_id,
                COUNT(p.player_id)        AS amount_of_players,
                AVG(p.player_injury_risk) AS average_risk_of_injury
            FROM player p
            JOIN (
                SELECT ps2.player_id
                FROM player_season ps2
                GROUP BY ps2.player_id
                HAVING MAX(ps2.player_season_year) = (SELECT current_season_year FROM season_meta)
            ) active ON active.player_id = p.player_id
            WHERE p.player_injury_risk < 0.99
            GROUP BY p.team_id
        ) ps ON ps.team_id = t.team_id
        LEFT JOIN (
            SELECT p2.team_id, COUNT(pi.player_injury_id) AS active_injuries
            FROM player p2
            JOIN player_season ps3 ON ps3.player_id = p2.player_id
            JOIN player_injury pi  ON pi.player_season_id = ps3.player_season_id
            WHERE ps3.player_season_year = (SELECT current_season_year FROM season_meta)
              AND pi.player_injury_end IS NULL
            GROUP BY p2.team_id
        ) inj ON inj.team_id = t.team_id
        ORDER BY t.team_name
    """))


def _create_mv_player_overview(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_player_overview AS
        SELECT
            p.player_id,
            p.player_first_name,
            p.player_last_name,
            p.player_photo,
            t.team_id,
            t.team_name,
            p.player_position,
            p.player_injury_risk,
            gd.player_injury_trend,
            COALESCE(si.seasonal_injuries, 0)        AS player_seasonal_injuries,
            COALESCE(ps_curr.player_season_minutes, 0) AS player_season_minutes
        FROM player p
        JOIN team t              ON t.team_id    = p.team_id
        JOIN graph_data gd       ON gd.player_id = p.player_id
        JOIN mv_teams_overview tov ON tov.team_id = p.team_id
        JOIN (
            SELECT player_id FROM player_season
            WHERE player_season_year = (SELECT current_season_year FROM season_meta)
        ) active ON active.player_id = p.player_id
        LEFT JOIN (
            SELECT ps2.player_id, COUNT(pi.player_injury_id) AS seasonal_injuries
            FROM player_season ps2
            JOIN (
                SELECT player_id, MAX(player_season_year) AS latest_year
                FROM player_season GROUP BY player_id
            ) latest ON latest.player_id = ps2.player_id
                   AND latest.latest_year = ps2.player_season_year
            JOIN player_injury pi ON pi.player_season_id = ps2.player_season_id
            GROUP BY ps2.player_id
        ) si ON si.player_id = p.player_id
        LEFT JOIN (
            SELECT player_id, player_season_minutes
            FROM player_season
            WHERE player_season_year = (SELECT current_season_year FROM season_meta)
        ) ps_curr ON ps_curr.player_id = p.player_id
    """))
    conn.execute(text("CREATE UNIQUE INDEX uq_mv_po_player_id ON mv_player_overview (player_id)"))
    conn.execute(text("CREATE INDEX idx_mv_po_risk  ON mv_player_overview (player_injury_risk DESC)"))
    conn.execute(text("CREATE INDEX idx_mv_po_trend ON mv_player_overview (player_injury_trend DESC)"))


def _create_mv_injury_history(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_injury_history AS
        SELECT
            pi.player_injury_id,
            ps.player_id,
            pi.player_injury_type,
            pi.player_injury_region,
            pi.player_injury_start,
            pi.player_injury_end,
            pi.player_injury_severity,
            pi.player_injury_days_out
        FROM player_injury pi
        JOIN player_season ps ON ps.player_season_id = pi.player_season_id
        ORDER BY pi.player_injury_start DESC
    """))
    conn.execute(text(
        "CREATE INDEX idx_mv_ih_player_start "
        "ON mv_injury_history (player_id, player_injury_start DESC)"
    ))
    conn.execute(text(
        "CREATE UNIQUE INDEX uq_mv_ih_injury_id "
        "ON mv_injury_history (player_injury_id)"
    ))


def _create_mv_search_players(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_search_players AS
        SELECT
            p.player_id,
            p.player_first_name,
            p.player_last_name,
            p.player_photo,
            t.team_name,
            p.player_injury_risk
        FROM player p
        JOIN team t ON t.team_id = p.team_id
        JOIN mv_teams_overview tov ON tov.team_id = p.team_id
        JOIN (
            SELECT player_id FROM player_season
            WHERE player_season_year = (SELECT current_season_year FROM season_meta)
        ) active ON active.player_id = p.player_id
        ORDER BY p.player_last_name
    """))
    conn.execute(text("CREATE INDEX idx_mv_sp_last_name ON mv_search_players (player_last_name)"))


def _create_mv_team_player_list(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_team_player_list AS
        SELECT
            p.player_id,
            p.team_id,
            p.player_first_name,
            p.player_last_name,
            p.player_injury_risk
        FROM player p
        JOIN mv_teams_overview tov ON tov.team_id = p.team_id
        JOIN (
            SELECT player_id FROM player_season
            WHERE player_season_year = (SELECT current_season_year FROM season_meta)
        ) active ON active.player_id = p.player_id
        ORDER BY p.player_last_name
    """))
    conn.execute(text(
        "CREATE INDEX idx_mv_tpl_team_risk "
        "ON mv_team_player_list (team_id, player_injury_risk DESC)"
    ))


def _create_mv_player_card(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_player_card AS
        WITH latest_season AS (
            SELECT player_id, MAX(player_season_year) AS latest_year
            FROM player_season
            GROUP BY player_id
        ),
        latest_season_stats AS (
            SELECT ps.player_id,
                   ps.player_season_minutes,
                   ps.player_season_games_missed
            FROM player_season ps
            JOIN latest_season ls
              ON ls.player_id = ps.player_id
             AND ls.latest_year = ps.player_season_year
        ),
        season_injuries AS (
            SELECT ps.player_id, COUNT(pi.player_injury_id) AS season_injuries
            FROM player_season ps
            JOIN player_injury pi ON pi.player_season_id = ps.player_season_id
            WHERE ps.player_season_year = (SELECT current_season_year FROM season_meta)
            GROUP BY ps.player_id
        )
        SELECT
            p.player_id,
            p.player_first_name,
            p.player_last_name,
            p.player_age,
            p.player_weight,
            p.player_height,
            p.player_photo,
            p.player_position,
            p.player_kit_number,
            p.player_injury_risk,
            n.nation_name,
            gd.player_injury_trend,
            lss.player_season_minutes,
            lss.player_season_games_missed,
            COALESCE(si.season_injuries, 0) AS player_season_injuries
        FROM player p
        JOIN nation n ON n.nation_id = p.nation_id
        LEFT JOIN graph_data gd ON gd.player_id = p.player_id
        LEFT JOIN latest_season_stats lss ON lss.player_id = p.player_id
        LEFT JOIN season_injuries si ON si.player_id = p.player_id
    """))
    conn.execute(text("CREATE UNIQUE INDEX uq_mv_pc_player_id ON mv_player_card (player_id)"))


def _create_mv_injury_analysis(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_injury_analysis AS
        WITH latest_season AS (
            SELECT player_id, MAX(player_season_year) AS latest_year
            FROM player_season
            GROUP BY player_id
        ),
        latest_season_stats AS (
            SELECT ps.player_id,
                   ps.player_season_appearences,
                   ps.player_season_games_missed,
                   ps.player_season_minutes
            FROM player_season ps
            JOIN latest_season ls
              ON ls.player_id = ps.player_id
             AND ls.latest_year = ps.player_season_year
        ),
        season_injuries AS (
            SELECT ps.player_id, COUNT(pi.player_injury_id) AS season_injuries
            FROM player_season ps
            JOIN player_injury pi ON pi.player_season_id = ps.player_season_id
            WHERE ps.player_season_year = (SELECT current_season_year FROM season_meta)
            GROUP BY ps.player_id
        ),
        totals AS (
            SELECT ps.player_id,
                   SUM(ps.player_season_games_missed) AS total_games_missed
            FROM player_season ps
            GROUP BY ps.player_id
        )
        SELECT
            ps.player_id,
            COUNT(pi.player_injury_id)                                             AS total_injuries,
            COUNT(pi.player_injury_id) FILTER (WHERE pi.player_injury_end IS NULL) AS ongoing_injuries,
            COALESCE(si.season_injuries, 0)                                        AS season_injuries,
            COALESCE(tot.total_games_missed, 0)                                    AS total_games_missed,
            lss.player_season_appearences,
            lss.player_season_games_missed                                         AS season_games_missed,
            lss.player_season_minutes,
            CASE
                WHEN COUNT(pi.player_injury_id) FILTER (WHERE pi.player_injury_end IS NULL) > 0
                    THEN 0
                WHEN MAX(pi.player_injury_end) IS NOT NULL
                    THEN GREATEST(0, CURRENT_DATE - MAX(pi.player_injury_end))
                ELSE NULL
            END AS days_since_injury
        FROM player_season ps
        LEFT JOIN player_injury pi    ON pi.player_season_id = ps.player_season_id
        LEFT JOIN season_injuries si  ON si.player_id = ps.player_id
        LEFT JOIN totals tot          ON tot.player_id = ps.player_id
        LEFT JOIN latest_season_stats lss ON lss.player_id = ps.player_id
        GROUP BY ps.player_id, si.season_injuries, tot.total_games_missed,
                 lss.player_season_appearences, lss.player_season_games_missed,
                 lss.player_season_minutes
    """))
    conn.execute(text("CREATE UNIQUE INDEX uq_mv_ia_player_id ON mv_injury_analysis (player_id)"))


def _create_mv_reported_injuries(conn: Connection) -> None:
    conn.execute(text("""
        CREATE MATERIALIZED VIEW mv_reported_injuries AS
        SELECT
            pi.player_injury_start,
            pi.player_injury_end,
            p.player_first_name,
            p.player_last_name,
            p.player_position,
            p.player_photo,
            tov.team_name,
            tov.team_logo,
            pi.player_injury_type,
            pi.player_injury_region,
            pi.player_injury_severity,
            pi.player_injury_days_out
        FROM player_injury pi
        JOIN player_season ps ON ps.player_season_id = pi.player_season_id
        JOIN player p ON p.player_id = ps.player_id
        JOIN mv_teams_overview tov ON tov.team_id = p.team_id
        JOIN player_season ps_curr
          ON ps_curr.player_id = p.player_id
         AND ps_curr.player_season_year = (SELECT current_season_year FROM season_meta)
        ORDER BY pi.player_injury_start DESC
    """))
    conn.execute(text(
        "CREATE INDEX idx_mv_ri_start_desc ON mv_reported_injuries (player_injury_start DESC)"
    ))
