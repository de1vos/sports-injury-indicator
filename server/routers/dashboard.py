from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from database import get_session
import models.dashboard as dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/matches/{game_week}")
def game_week_matches(game_week: str, session: Session = Depends(get_session)):
    return dashboard.get_game_week_matches(game_week, session)


@router.get("/high-risk-players")
def high_risk_players(session: Session = Depends(get_session), user_id: int | None = Query(default=None)):
    return dashboard.get_high_risk_players(session, user_id)


@router.get("/trending-risk-players")
def trending_risk_players(session: Session = Depends(get_session), user_id: int | None = Query(default=None)):
    return dashboard.get_trending_risk_players(session, user_id)
