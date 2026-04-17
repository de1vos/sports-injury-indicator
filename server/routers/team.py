from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import models.teams as teams
import models.dashboard as dashboard

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/")
def list_teams(session: Session = Depends(get_session)):
    return teams.get_all_teams(session)


@router.get("/overview")
def teams_overview(session: Session = Depends(get_session)):
    return teams.get_teams_overview(session)


@router.get("/risk-count")
def teams_risk_count(session: Session = Depends(get_session)):
    return dashboard.get_teams_with_risk_count(session)


@router.get("/{team_id}")
def get_team(team_id: int, session: Session = Depends(get_session)):
    team = teams.get_team_by_id(team_id, session)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("/ingest")
def ingest_teams(teams_data: List[dict], session: Session = Depends(get_session)):
    created = teams.ingest_teams(teams_data, session)
    return {"inserted": len(created)}


@router.get("/nations/")
def list_nations(session: Session = Depends(get_session)):
    return teams.get_all_nations(session)


@router.post("/nations/ingest")
def ingest_nations(nations: List[dict], session: Session = Depends(get_session)):
    created = teams.ingest_nations(nations, session)
    return {"inserted": len(created)}
