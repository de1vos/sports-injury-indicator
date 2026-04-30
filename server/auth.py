import jwt
from uuid import UUID
from fastapi import Header, HTTPException

_JWKS_URL = "https://cbgumeemmcznxbypakxc.supabase.co/auth/v1/.well-known/jwks.json"
_jwks_client = jwt.PyJWKClient(_JWKS_URL, cache_keys=True)


def current_user_id(authorization: str = Header(...)) -> UUID:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization[7:]
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(401, str(e))
    except Exception as e:
        raise HTTPException(401, f"Unexpected error: {type(e).__name__}: {e}")
    return UUID(payload["sub"])


def decode_token_unverified(token: str) -> dict:
    return jwt.decode(
        token,
        options={"verify_signature": False, "verify_aud": False},
        algorithms=["ES256", "RS256", "HS256"],
    )
