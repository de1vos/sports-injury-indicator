from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import models.match as match_model

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/")
def list_matches(session: Session = Depends(get_session)):
    return match_model.get_all_matches(session)


@router.get("/{match_id}")
def get_match(match_id: int, session: Session = Depends(get_session)):
    match = match_model.get_match_by_id(match_id, session)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/ingest")
def ingest_matches(matches: List[dict], session: Session = Depends(get_session)):
    created = match_model.ingest_matches(matches, session)
    return {"inserted": len(created)}
