from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import models.teams as teams
import models.dashboard as dashboard

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/week")
def matches_this_week(session: Session = Depends(get_session)):
    return dashboard.get_matches_around_today(session)


@router.get("/")
def list_matches(session: Session = Depends(get_session)):
    return teams.get_all_matches(session)


@router.get("/{match_id}")
def get_match(match_id: int, session: Session = Depends(get_session)):
    match = teams.get_match_by_id(match_id, session)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/ingest")
def ingest_matches(matches: List[dict], session: Session = Depends(get_session)):
    created = teams.ingest_matches(matches, session)
    return {"inserted": len(created)}


@router.get("/next")
def list_next_matches(session: Session = Depends(get_session)):
    return teams.get_all_next_matches(session)


@router.post("/next/ingest")
def ingest_next_matches(matches: List[dict], session: Session = Depends(get_session)):
    created = teams.ingest_next_matches(matches, session)
    return {"inserted": len(created)}
