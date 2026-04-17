from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import models.player_page as player_page
import models.reported_injuries as reported_injuries
import models.dashboard as dashboard

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/")
def list_players(session: Session = Depends(get_session)):
    return player_page.get_all_players_with_details(session)


@router.get("/high-risk")
def high_risk_players(session: Session = Depends(get_session)):
    return dashboard.get_high_risk_players(session)


@router.get("/{player_id}")
def get_player(player_id: int, session: Session = Depends(get_session)):
    player = player_page.get_player_by_id(player_id, session)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.post("/ingest")
def ingest_players(players: List[dict], session: Session = Depends(get_session)):
    created = player_page.ingest_players(players, session)
    return {"inserted": len(created)}


@router.post("/ingest/injuries")
def ingest_injuries(injuries: List[dict], session: Session = Depends(get_session)):
    created = reported_injuries.ingest_player_injuries(injuries, session)
    return {"inserted": len(created)}


@router.post("/ingest/seasons")
def ingest_seasons(seasons: List[dict], session: Session = Depends(get_session)):
    created = player_page.ingest_player_seasons(seasons, session)
    return {"inserted": len(created)}


@router.post("/ingest/graph")
def ingest_graph(graph_data: List[dict], session: Session = Depends(get_session)):
    created = player_page.ingest_graph_data(graph_data, session)
    return {"inserted": len(created)}
