import json
from sqlmodel import Session
from database_init import engine
from models.player import get_all_players_with_details

with Session(engine) as session:
    players = get_all_players_with_details(session)
    print(json.dumps(players, indent=2))
