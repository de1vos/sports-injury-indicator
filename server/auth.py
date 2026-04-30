import os
import jwt
from uuid import UUID
from fastapi import Header, HTTPException

_JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]


def current_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization[7:]
    try:
        payload = jwt.decode(
            token, _JWT_SECRET,
            algorithms=["HS256"], audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(401, str(e))
    return UUID(payload["sub"])
