"""Password hashing and bearer authentication. Roles always come from the database."""
from datetime import datetime, timedelta, timezone
import os
import jwt
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.database import get_db
from app.models.domain import User

password_hasher = PasswordHash.recommended()
dummy_hash = password_hasher.hash("unused timing equalizer")
bearer = HTTPBearer(auto_error=False)

def access_token(user):
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(user.id), "ver": user.token_version, "type": "access", "iat": now,
                       "exp": now + timedelta(minutes=settings.access_token_expire_minutes)},
                      settings.jwt_secret, algorithm=settings.jwt_algorithm)

def require_verified_staff_email(user):
    """Optional deployment policy; email verification never grants a staff role."""
    enabled = os.getenv("STAFF_REQUIRE_VERIFIED_EMAIL", "false").strip().lower() in {"1", "true"}
    if enabled and user.role in {"authority", "admin"} and not user.email_verified:
        raise HTTPException(403, "Verify your staff email address before accessing staff services")
    return user


STAFF_EMAIL_SETUP_ROUTES = {
    ("GET", "/api/v1/auth/me"), ("PATCH", "/api/v1/auth/me"),
    ("POST", "/api/v1/auth/request-email-verification"),
    ("POST", "/api/v1/auth/verify-email"),
}


def optional_user(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    if credentials is None:
        return None
    try:
        claims = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm],
                            options={"require": ["sub", "exp", "iat", "type", "ver"]})
        if claims["type"] != "access":
            raise ValueError()
        user = db.get(User, int(claims["sub"]))
        if user is None or not user.is_active or user.token_version != claims["ver"]:
            raise ValueError()
        route_path = getattr(request.scope.get("route"), "path", request.url.path).rstrip("/")
        if (request.method, route_path) not in STAFF_EMAIL_SETUP_ROUTES:
            require_verified_staff_email(user)
        return user
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(401, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"}) from None

def get_current_user(user = Depends(optional_user)):
    if user is None:
        raise HTTPException(401, "Authentication required", headers={"WWW-Authenticate": "Bearer"})
    return user

def require_citizen(user = Depends(get_current_user)):
    if user.role != "citizen":
        raise HTTPException(403, "Citizen access required")
    return user

def require_authority(user = Depends(get_current_user)):
    if user.role not in {"authority", "admin"}:
        raise HTTPException(403, "Authority access required")
    return require_verified_staff_email(user)

def require_admin(user = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return require_verified_staff_email(user)
