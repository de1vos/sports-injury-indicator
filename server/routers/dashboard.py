from fastapi import APIRouter, Depends
from sqlmodel import Session
from database import get_session
import models.dashboard as dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/past-games")
def past_games(session: Session = Depends(get_session)):
    return dashboard.get_past_games(session)


@router.get("/upcoming-games")
def upcoming_games(session: Session = Depends(get_session)):
    return dashboard.get_upcoming_games(session)


@router.get("/high-risk-players")
def high_risk_players(session: Session = Depends(get_session)):
    return dashboard.get_high_risk_players(session)


@router.get("/teams-risk-count")
def teams_risk_count(session: Session = Depends(get_session)):
    return dashboard.get_teams_with_risk_count(session)
