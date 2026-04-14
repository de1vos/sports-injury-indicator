from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import models.team as team_model

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/")
def list_teams(session: Session = Depends(get_session)):
    return team_model.get_all_teams(session)


@router.get("/{team_id}")
def get_team(team_id: int, session: Session = Depends(get_session)):
    team = team_model.get_team_by_id(team_id, session)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("/ingest")
def ingest_teams(teams: List[dict], session: Session = Depends(get_session)):
    created = team_model.ingest_teams(teams, session)
    return {"inserted": len(created)}


@router.get("/nations/")
def list_nations(session: Session = Depends(get_session)):
    return team_model.get_all_nations(session)


@router.post("/nations/ingest")
def ingest_nations(nations: List[dict], session: Session = Depends(get_session)):
    created = team_model.ingest_nations(nations, session)
    return {"inserted": len(created)}
