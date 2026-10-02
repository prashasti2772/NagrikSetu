"""Small, environment-based configuration with local development defaults."""

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    app_name: str = field(default_factory=lambda: os.getenv("APP_NAME", "NagrikSetu API"))
    database_url: str = field(default_factory=lambda: (
        os.getenv("DATABASE_URL", "").strip()
        or f"sqlite:///{(BACKEND_DIR / 'nagriksetu.db').as_posix()}"
    ), repr=False)
    jwt_secret: str = field(default_factory=lambda: os.getenv("JWT_SECRET", "").strip() or secrets.token_urlsafe(48), repr=False)
    jwt_algorithm: str = field(default_factory=lambda: os.getenv("JWT_ALGORITHM", "HS256"))
    access_token_expire_minutes: int = field(default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")))
    otp_expire_minutes: int = field(default_factory=lambda: int(os.getenv("OTP_EXPIRE_MINUTES", "10")))
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    cors_origins: list[str] = field(default_factory=lambda: [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ])


settings = Settings()

if settings.jwt_algorithm not in {"HS256", "HS384", "HS512"}:
    raise ValueError("JWT_ALGORITHM must be HS256, HS384 or HS512")
if settings.app_env != "development" and len(os.getenv("JWT_SECRET", "").strip()) < 32:
    raise ValueError("Configure JWT_SECRET with at least 32 characters outside development")
if settings.access_token_expire_minutes <= 0 or settings.otp_expire_minutes <= 0:
    raise ValueError("Token and OTP expiry must be positive")
