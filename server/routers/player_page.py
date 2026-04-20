from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
import models.player_page as player_page

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/team/{team_id}")
def team_player_list(team_id: int, session: Session = Depends(get_session)):
    return player_page.get_team_player_list(team_id, session)


@router.get("/{player_id}/card")
def player_card(player_id: int, session: Session = Depends(get_session)):
    result = player_page.get_player_card(player_id, session)
    if not result:
        raise HTTPException(status_code=404, detail="Player not found")
    return result


@router.get("/{player_id}/graph")
def injury_prediction_graph(player_id: int, session: Session = Depends(get_session)):
    result = player_page.get_injury_prediction_graph(player_id, session)
    if not result:
        raise HTTPException(status_code=404, detail="Graph data not found")
    return result


@router.get("/{player_id}/seasons")
def season_statistics(player_id: int, session: Session = Depends(get_session)):
    return player_page.get_season_statistics(player_id, session)


@router.get("/{player_id}/injury-history")
def injury_history(player_id: int, session: Session = Depends(get_session)):
    return player_page.get_injury_history(player_id, session)


@router.get("/{player_id}/injury-analysis")
def injury_analysis(player_id: int, session: Session = Depends(get_session)):
    return player_page.get_injury_analysis(player_id, session)
