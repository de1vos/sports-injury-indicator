"""
Phase 1 — Ingest ML output into PostgreSQL.

Reads:
  output/predictions.json  — 925 player records
  output/matches.json      — completed + upcoming PL fixtures
  output/nations.json      — nation name → flag URL

Writes (idempotent — safe to re-run):
  nation, team, player, player_season, player_injury, graph_data, match

Preserves:
  user_favourite
  (player_id / team_id are stable API-Football IDs, so FKs remain valid
   across re-ingestions as long as IDs don't change in the source data)

Run:
  cd server && python ingest_predictions.py
"""

import json
import re
import sys
from datetime import date, time as dtime, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy import text, insert
from create_views import create_all_views

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database_init import (
    engine,
    Nation, Team, Player, PlayerSeason, PlayerInjury, GraphData, Match, SeasonMeta,
)

OUTPUT_DIR       = ROOT / "output"
PREDICTIONS_FILE = OUTPUT_DIR / "predictions.json"
MATCHES_FILE     = OUTPUT_DIR / "matches.json"
NATIONS_FILE     = OUTPUT_DIR / "nations.json"

INJURED_SENTINEL = Decimal("0.990")
GW_ROUND_RE      = re.compile(r"Regular Season\s*-\s*(\d+)", re.IGNORECASE)
GW_LABEL_RE      = re.compile(r"GW(\d+)", re.IGNORECASE)


# ── Helpers ───────────────────────────────────────────────────────────────────

def clamp_risk(val) -> Decimal:
    try:
        v = Decimal(str(val))
    except (InvalidOperation, TypeError):
        v = Decimal("0")
    return min(max(v, Decimal("0")), Decimal("0.999"))


def safe_str(val, max_len: int | None = None, fallback: str = "") -> str:
    s = str(val) if val is not None else fallback
    if s.lower() in ("nan", "none", ""):
        s = fallback
    return s[:max_len] if max_len else s


def parse_date(s) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def parse_time(s) -> dtime | None:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(str(s))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).time().replace(tzinfo=None)
    except ValueError:
        return None


def row_count(conn, table: str) -> int:
    return conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Loading output files...")
    with open(PREDICTIONS_FILE) as f:
        predictions_raw = json.load(f)
    players = predictions_raw["players"]
    with open(MATCHES_FILE) as f:
        matches_raw = json.load(f)
    with open(NATIONS_FILE) as f:
        nations_raw = json.load(f)

    print(f"  {len(players)} players")
    print(f"  {len(nations_raw)} nations")
    print(f"  {len(matches_raw['completed'])} completed + {len(matches_raw['upcoming'])} upcoming matches")

    with engine.connect() as conn:

        # Defer FK checks so we can delete + re-insert in bulk without ordering issues
        conn.execute(text("SET CONSTRAINTS ALL DEFERRED"))

        # ── 1. Drop materialized views (must happen before table wipe) ────────
        print("\nDropping materialized views...")
        for view in (
            "mv_player_overview", "mv_injury_history",
            "mv_search_players", "mv_team_player_list", "mv_reported_injuries",
            "mv_teams_overview",
            "mv_player_card", "mv_injury_analysis", "mv_game_week_matches",
        ):
            conn.execute(text(f"DROP MATERIALIZED VIEW IF EXISTS {view}"))
        print("  views dropped")

        # ── 2. Wipe ML-derived tables ─────────────────────────────────────────
        print("\nClearing ML-derived tables...")
        for tbl in ("graph_data", "player_injury", "player_season", "match",
                    "player", "team", "nation", "season_meta"):
            conn.execute(text(f"DELETE FROM {tbl}"))
            print(f"  cleared {tbl}")

        # ── 2. Nations ────────────────────────────────────────────────────────
        print("\nInserting nations...")
        nation_rows = [
            {
                "nation_name":       n["nation_name"],
                "nation_flag_image": n.get("nation_flag_image") or "",
            }
            for n in nations_raw
        ]
        result = conn.execute(
            insert(Nation).returning(Nation.nation_id, Nation.nation_name),
            nation_rows,
        )
        nation_name_to_id: dict[str, int] = {row.nation_name: row.nation_id for row in result}
        print(f"  {len(nation_name_to_id)} nations inserted")

        # ── 3. Teams ──────────────────────────────────────────────────────────
        print("\nInserting teams...")
        seen_teams: set[int] = set()
        team_rows = []
        for p in players:
            tid = p.get("team_id")
            if tid is None or tid in seen_teams:
                continue
            seen_teams.add(tid)
            team_rows.append({
                "team_id":    tid,
                "team_name":  safe_str(p.get("team"), max_len=200),
                "team_logo":  safe_str(p.get("team_logo"), max_len=500),
                "team_color": safe_str(p.get("team_color") or "#888888", max_len=10),
            })
        conn.execute(insert(Team), team_rows)
        print(f"  {len(team_rows)} teams inserted")

        # ── 4. Players ────────────────────────────────────────────────────────
        print("\nInserting players...")
        player_rows = []
        skipped_players: list[int] = []
        for p in players:
            nation_id = nation_name_to_id.get(p.get("nationality", ""))
            if nation_id is None:
                print(f"  [WARN] no nation_id for '{p.get('nationality')}' — player {p['player_id']} skipped")
                skipped_players.append(p["player_id"])
                continue
            height = p.get("height")
            weight = p.get("weight")
            player_rows.append({
                "player_id":          p["player_id"],
                "team_id":            p["team_id"],
                "nation_id":          nation_id,
                "player_first_name":  safe_str(p.get("firstname"), max_len=100),
                "player_last_name":   safe_str(p.get("lastname"),  max_len=100),
                "player_position":    safe_str(p.get("position"),  max_len=50),
                "player_age":         p.get("age") or 0,
                "player_height":      f"{height} cm" if height else "",
                "player_weight":      f"{weight} kg" if weight else "",
                "player_photo":       safe_str(p.get("photo"), max_len=500),
                "player_kit_number":  p.get("kit_number") or 0,
                "player_injury_risk": clamp_risk(p.get("injury_risk", 0)),
                "player_risk_factor_1": safe_str(p.get("risk_factor_1"), max_len=100),
                "player_risk_factor_2": safe_str(p.get("risk_factor_2"), max_len=100),
                "player_risk_factor_3": safe_str(p.get("risk_factor_3"), max_len=100),
            })
        conn.execute(insert(Player), player_rows)
        print(f"  {len(player_rows)} players inserted ({len(skipped_players)} skipped)")

        # ── 5. Player seasons ─────────────────────────────────────────────────
        print("\nInserting player seasons...")
        season_rows = []
        seen_season_keys: set[tuple[int, int]] = set()
        for p in players:
            if p["player_id"] in skipped_players:
                continue
            for s in p.get("season_stats", []):
                key = (p["player_id"], s.get("season") or 0)
                if key in seen_season_keys:
                    print(f"  [WARN] duplicate season skipped: player={p['player_id']} season={s.get('season')}")
                    continue
                seen_season_keys.add(key)
                season_rows.append({
                    "player_id":                    p["player_id"],
                    "player_season_year":           s.get("season") or 0,
                    "player_season_appearences":    s.get("appearances") or 0,
                    "player_season_minutes":        s.get("minutes") or 0,
                    "player_season_fouls_drawn":    s.get("fouls_drawn") or 0,
                    "player_season_fouls_commited": s.get("fouls_committed") or 0,
                    "player_season_duels_total":    s.get("duels_total") or 0,
                    "player_season_tackles":        s.get("tackles") or 0,
                    "player_season_yellow_cards":   s.get("yellow_cards") or 0,
                    "player_season_red_cards":      s.get("red_cards") or 0,
                    "player_season_goals":          s.get("goals") or 0,
                    "player_season_assists":        s.get("assists") or 0,
                    "player_season_dribbles_attempts": s.get("dribbles_attempts") or 0,
                    "player_season_games_missed":   s.get("games_missed") or 0,
                    "player_season_rating":         Decimal(str(s.get("rating") or 0)),
                })
        result = conn.execute(
            insert(PlayerSeason).returning(
                PlayerSeason.player_season_id,
                PlayerSeason.player_id,
                PlayerSeason.player_season_year,
            ),
            season_rows,
        )
        season_id_map: dict[tuple[int, int], int] = {
            (row.player_id, row.player_season_year): row.player_season_id
            for row in result
        }
        print(f"  {len(season_rows)} player seasons inserted")

        # ── 6. Player injuries ────────────────────────────────────────────────
        print("\nInserting player injuries...")
        injury_rows = []
        for p in players:
            if p["player_id"] in skipped_players:
                continue
            pid = p["player_id"]
            seasons_for_player = {yr for (ppid, yr) in season_id_map if ppid == pid}

            for inj in p.get("injury_history", []):
                start = parse_date(inj.get("start"))
                if start is None:
                    continue
                # Map injury to a season (PL seasons run Jul–Jun)
                inj_season_yr = start.year if start.month >= 7 else start.year - 1
                if inj_season_yr in seasons_for_player:
                    season_key = (pid, inj_season_yr)
                elif seasons_for_player:
                    closest_yr = min(seasons_for_player, key=lambda y: abs(y - inj_season_yr))
                    season_key = (pid, closest_yr)
                else:
                    continue

                psid = season_id_map.get(season_key)
                if psid is None:
                    continue

                injury_rows.append({
                    "player_season_id":       psid,
                    "player_injury_type":     safe_str(inj.get("type"),        max_len=200, fallback="Unknown"),
                    "player_injury_days_out": inj.get("days_out") or 0,
                    "player_injury_start":    start,
                    "player_injury_end":      parse_date(inj.get("end")),
                    "player_injury_severity": safe_str(inj.get("severity"),    max_len=50, fallback="Unknown"),
                    "player_injury_region":   safe_str(inj.get("body_region"), max_len=50, fallback="Unknown"),
                })

        if injury_rows:
            conn.execute(insert(PlayerInjury), injury_rows)
        print(f"  {len(injury_rows)} injury records inserted")

        # ── 7. Graph data ─────────────────────────────────────────────────────
        print("\nInserting graph data...")
        graph_rows = []
        for p in players:
            if p["player_id"] in skipped_players:
                continue

            # Map "GW1"…"GW38" labels → gw_1…gw_38 columns
            gw_map: dict[str, Decimal] = {}
            for entry in p.get("injury_risk_trend", []):
                m = GW_LABEL_RE.match(str(entry.get("gw", "")))
                if not m:
                    continue
                n = int(m.group(1))
                if not 1 <= n <= 38:
                    continue
                risk = entry.get("risk")
                gw_map[f"gw_{n}"] = INJURED_SENTINEL if risk == "Injured" else clamp_risk(risk)

            row: dict = {
                "player_id":           p["player_id"],
                "player_injury_trend": Decimal(str(p.get("injury_trend") or 0)),
            }
            for i in range(1, 39):
                row[f"gw_{i}"] = gw_map.get(f"gw_{i}", Decimal("0"))
            graph_rows.append(row)

        conn.execute(insert(GraphData), graph_rows)
        print(f"  {len(graph_rows)} graph data rows inserted")

        # ── 8. Matches ────────────────────────────────────────────────────────
        print("\nInserting matches...")
        match_rows = []
        all_fixtures = (
            [(fx, True)  for fx in matches_raw.get("completed", [])] +
            [(fx, False) for fx in matches_raw.get("upcoming",  [])]
        )

        for fx, is_played in all_fixtures:
            m = GW_ROUND_RE.match(fx.get("round", ""))
            if not m:
                continue  # non-PL fixture — skip

            match_date = parse_date(fx.get("date"))
            if match_date is None:
                continue

            score = fx.get("score", {}) or {}
            match_rows.append({
                "home_team_id":         fx["home_team_id"],
                "away_team_id":         fx["away_team_id"],
                "match_date":           match_date,
                "match_time":           parse_time(fx.get("date")),
                "match_fixture_id":     fx["fixture_id"],
                "match_game_week":      f"gw{int(m.group(1))}",
                "match_venue":          safe_str(fx.get("venue"), max_len=200),
                "match_goals_home":     score.get("home") or 0,
                "match_goals_away":     score.get("away") or 0,
                "home_avg_injury_risk": Decimal("0"),
                "away_avg_injury_risk": Decimal("0"),
                "match_is_played":      is_played,
            })

        if match_rows:
            conn.execute(insert(Match), match_rows)
        print(f"  {len(match_rows)} matches inserted")

        # ── 9. Compute avg injury risk per match ──────────────────────────────
        print("\nComputing per-match average injury risks...")
        conn.execute(text("""
            UPDATE match SET
                home_avg_injury_risk = COALESCE((
                    SELECT AVG(player_injury_risk)
                    FROM player
                    WHERE team_id = match.home_team_id
                      AND player_injury_risk < 0.99
                ), 0),
                away_avg_injury_risk = COALESCE((
                    SELECT AVG(player_injury_risk)
                    FROM player
                    WHERE team_id = match.away_team_id
                      AND player_injury_risk < 0.99
                ), 0)
        """))

        # ── 10. Season meta ───────────────────────────────────────────────────
        season_yr  = predictions_raw["current_season"]
        gw_int     = predictions_raw["current_gameweek"]
        current_gw = f"gw{gw_int}"
        conn.execute(insert(SeasonMeta), [{"current_season_year": season_yr, "current_game_week": current_gw}])
        print(f"  season_meta: year={season_yr}, gw={current_gw}")

        conn.commit()

    # ── Create materialized views ─────────────────────────────────────────────
    print("\nCreating materialized views...")
    with engine.connect() as conn:
        create_all_views(conn)
        conn.commit()

    # ── Row count summary ─────────────────────────────────────────────────────
    print(f"\n{'─' * 40}")
    print("Ingestion complete. Row counts:")
    with engine.connect() as conn:
        for tbl in ("nation", "team", "player", "player_season", "player_injury", "graph_data", "match", "season_meta"):
            print(f"  {tbl:<20} {row_count(conn, tbl):>6} rows")


if __name__ == "__main__":
    main()
