import json
from sqlmodel import Session
from database_init import engine
from models.player_page import get_all_players_with_details, get_player_by_id, get_player_seasons, get_player_injury_summary
from models.dashboard import get_high_risk_players, get_teams_with_risk_count
from models.my_players import get_favourite_players
from models.teams import get_teams_overview, get_all_next_matches

TEST_USER_ID = 1
TEST_PLAYER_ID = 2

with Session(engine) as session:
    print("=== Players ===")
    players = get_all_players_with_details(session)
    print(json.dumps(players, indent=2))

    print(f"\n=== Player by ID (player_id={TEST_PLAYER_ID}) ===")
    player = get_player_by_id(TEST_PLAYER_ID, session)
    print(json.dumps(player.model_dump() if player else None, indent=2, default=str))

    print(f"\n=== Player Seasons (player_id={TEST_PLAYER_ID}) ===")
    seasons = get_player_seasons(TEST_PLAYER_ID, session)
    print(json.dumps(seasons, indent=2))

    print(f"\n=== Player Injury Summary (player_id={TEST_PLAYER_ID}) ===")
    injury_summary = get_player_injury_summary(TEST_PLAYER_ID, session)
    print(json.dumps(injury_summary, indent=2))

    print("\n=== High Risk Players (risk > 0.50) ===")
    high_risk = get_high_risk_players(session)
    print(json.dumps(high_risk, indent=2))

    print("\n=== Teams Risk Count ===")
    teams_risk = get_teams_with_risk_count(session)
    print(json.dumps(teams_risk, indent=2))

    print(f"\n=== Favourite Players (user_id={TEST_USER_ID}) ===")
    favourites = get_favourite_players(TEST_USER_ID, session)
    print(json.dumps(favourites, indent=2))

    print("\n=== Teams Overview ===")
    overview = get_teams_overview(session)
    print(json.dumps(overview, indent=2))

    print("\n=== Next Matches ===")
    next_matches = get_all_next_matches(session)
    print(json.dumps([m.model_dump() for m in next_matches], indent=2, default=str))
