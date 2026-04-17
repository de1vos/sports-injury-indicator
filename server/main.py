from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import player, team, match, my_players

app = FastAPI(title="Sports Injury Indicator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server (Vite default)
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(player.router)
app.include_router(team.router)
app.include_router(match.router)
app.include_router(my_players.router)


@app.get("/")
def root():
    return {"status": "ok"}
