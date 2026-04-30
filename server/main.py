import os
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from routers import player_page, teams, dashboard, my_players, reported_injuries, search
from auth import decode_token_unverified, _jwks_client
import jwt

app = FastAPI(title="Sports Injury Indicator API")

_allowed_origins = ["http://localhost:5173"]
for _origin in os.environ.get("ALLOWED_ORIGINS", "").split(","):
    _origin = _origin.strip()
    if _origin:
        _allowed_origins.append(_origin)

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


@app.get("/debug/token")
def debug_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(400, "Need Bearer token")
    token = authorization[7:]
    unverified = decode_token_unverified(token)
    result = {
        "unverified_claims": unverified,
        "alg": jwt.get_unverified_header(token).get("alg"),
        "kid": jwt.get_unverified_header(token).get("kid"),
    }
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        verified = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
        result["verified"] = True
        result["verified_claims"] = verified
    except Exception as e:
        result["verified"] = False
        result["error"] = f"{type(e).__name__}: {e}"
    return result
