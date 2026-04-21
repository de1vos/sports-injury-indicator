from fastapi import APIRouter, Depends
from sqlmodel import Session
from database import get_session
import integration.my_players as my_players_model

router = APIRouter(prefix="/my-players", tags=["my-players"])


@router.get("/{user_id}")
def get_favourite_players(user_id: int, session: Session = Depends(get_session)):
    return my_players_model.get_favourite_players(user_id, session)
