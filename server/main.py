import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import player_page, teams, dashboard, my_players, reported_injuries, search

app = FastAPI(title="Sports Injury Indicator API")

_allowed_origins = ["http://localhost:5173"]
_prod_origin = os.environ.get("ALLOWED_ORIGIN")
if _prod_origin:
    _allowed_origins.append(_prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(player_page.router)
app.include_router(teams.router)
app.include_router(dashboard.router)
app.include_router(my_players.router)
app.include_router(reported_injuries.router)
app.include_router(search.router)


@app.get("/")
def root():
    return {"status": "ok"}
