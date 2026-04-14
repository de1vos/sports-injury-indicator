from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import models.player as player_model

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/", response_model=List[dict])
def list_players(session: Session = Depends(get_session)):
    return player_model.get_all_players(session)


@router.get("/{player_id}")
def get_player(player_id: int, session: Session = Depends(get_session)):
    player = player_model.get_player_by_id(player_id, session)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.post("/ingest")
def ingest_players(players: List[dict], session: Session = Depends(get_session)):
    created = player_model.ingest_players(players, session)
    return {"inserted": len(created)}


@router.post("/ingest/injuries")
def ingest_injuries(injuries: List[dict], session: Session = Depends(get_session)):
    created = player_model.ingest_player_injuries(injuries, session)
    return {"inserted": len(created)}


@router.post("/ingest/seasons")
def ingest_seasons(seasons: List[dict], session: Session = Depends(get_session)):
    created = player_model.ingest_player_seasons(seasons, session)
    return {"inserted": len(created)}


@router.post("/ingest/graph")
def ingest_graph(graph_data: List[dict], session: Session = Depends(get_session)):
    created = player_model.ingest_graph_data(graph_data, session)
    return {"inserted": len(created)}
