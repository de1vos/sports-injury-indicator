from fastapi import APIRouter, Depends
from sqlmodel import Session
from database import get_session
import integration.teams as teams

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/overview")
def teams_overview(session: Session = Depends(get_session)):
    return teams.get_teams_overview(session)
