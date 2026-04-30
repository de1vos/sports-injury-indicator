from uuid import UUID
from fastapi import APIRouter, Depends
from sqlmodel import Session
from database import get_session
from auth import current_user_id
import integration.my_players as svc

router = APIRouter(prefix="/favourites", tags=["favourites"])


@router.get("")
def list_favourites(user_id: UUID = Depends(current_user_id),
                    session: Session = Depends(get_session)):
    return svc.get_favourite_players(user_id, session)


@router.post("/{player_id}", status_code=204)
def add_favourite(player_id: int,
                  user_id: UUID = Depends(current_user_id),
                  session: Session = Depends(get_session)):
    svc.add_favourite(user_id, player_id, session)


@router.delete("/{player_id}", status_code=204)
def remove_favourite(player_id: int,
                     user_id: UUID = Depends(current_user_id),
                     session: Session = Depends(get_session)):
    svc.remove_favourite(user_id, player_id, session)
