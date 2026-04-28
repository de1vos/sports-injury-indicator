from fastapi import APIRouter, Depends
from sqlmodel import Session
from database import get_session
import integration.search as search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/players")
def search_players(session: Session = Depends(get_session)):
    return search.get_search_players(session)


@router.get("/teams")
def search_teams(session: Session = Depends(get_session)):
    return search.get_search_teams(session)


@router.get("/injury-regions")
def injury_regions(session: Session = Depends(get_session)):
    return search.get_injury_regions(session)
