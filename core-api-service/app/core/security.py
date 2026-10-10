from typing import Optional
from fastapi import Header, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_api_key(
    x_api_key: Optional[str] = Security(api_key_header),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> Optional[str]:
    """
    Validates API key or bearer token if provided.
    Does not reject requests if no key is configured or if header is omitted (permissive mode),
    allowing seamless internal calls while supporting token enforcement where needed.
    """
    token = x_api_key or (credentials.credentials if credentials else None)
    if not token:
        return None

    if settings.API_KEY and token != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key or bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token
