"""Small, environment-based configuration with local development defaults."""

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path
from dotenv.parser import parse_stream


BACKEND_DIR = Path(__file__).resolve().parents[2]


def gemini_dotenv_values():
    values = {}
    try:
        with (BACKEND_DIR / ".env").open(encoding="utf-8") as environment_file:
            for binding in parse_stream(environment_file):
                if binding.key in {"GEMINI_API_KEY", "GEMINI_MODEL"}:
                    values[binding.key] = binding.value or ""
    except OSError:
        pass
    return values


_GEMINI_DOTENV = gemini_dotenv_values()


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
    duplicate_threshold: float = field(default_factory=lambda: float(os.getenv("DUPLICATE_THRESHOLD", "0.65")))
    duplicate_lookback_days: int = field(default_factory=lambda: int(os.getenv("DUPLICATE_LOOKBACK_DAYS", "90")))
    duplicate_candidate_limit: int = field(default_factory=lambda: int(os.getenv("DUPLICATE_CANDIDATE_LIMIT", "500")))
    rate_limit_window_seconds: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")))
    rate_limit_login: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_LOGIN", "10")))
    rate_limit_register: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_REGISTER", "5")))
    rate_limit_forgot: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_FORGOT", "5")))
    rate_limit_verify: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_VERIFY", "10")))
    rate_limit_intelligence: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_INTELLIGENCE", "20")))
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", _GEMINI_DOTENV.get("GEMINI_API_KEY", "")).strip(), repr=False)
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", _GEMINI_DOTENV.get("GEMINI_MODEL", "")).strip() or "gemini-2.5-flash")
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

if not 0 <= settings.duplicate_threshold <= 1:
    raise ValueError("DUPLICATE_THRESHOLD must be between 0 and 1")
if any(value <= 0 for value in [settings.duplicate_lookback_days, settings.duplicate_candidate_limit,
    settings.rate_limit_window_seconds, settings.rate_limit_login, settings.rate_limit_register,
    settings.rate_limit_forgot, settings.rate_limit_verify, settings.rate_limit_intelligence]):
    raise ValueError("Rate limits and duplicate search limits must be positive")
