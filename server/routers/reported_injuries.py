from fastapi import APIRouter, Depends
from sqlmodel import Session
from database import get_session
import models.reported_injuries as reported_injuries

router = APIRouter(prefix="/reported-injuries", tags=["reported-injuries"])


@router.get("/")
def get_reported_injuries(session: Session = Depends(get_session)):
    return reported_injuries.get_reported_injuries(session)
