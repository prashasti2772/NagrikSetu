"""Small, environment-based configuration with local development defaults."""

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlsplit
from dotenv import dotenv_values
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


BACKEND_DIR = Path(__file__).resolve().parents[2]
_LOCAL_ENV = dotenv_values(BACKEND_DIR / ".env")


def integration_setting(name, default=""):
    if name in os.environ:
        return os.environ[name]
    return _LOCAL_ENV.get(name) or default


def integration_int(name, default):
    try:
        value = int(integration_setting(name, str(default)))
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


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
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development").strip().lower())
    duplicate_threshold: float = field(default_factory=lambda: float(os.getenv("DUPLICATE_THRESHOLD", "0.65")))
    duplicate_lookback_days: int = field(default_factory=lambda: int(os.getenv("DUPLICATE_LOOKBACK_DAYS", "90")))
    duplicate_candidate_limit: int = field(default_factory=lambda: int(os.getenv("DUPLICATE_CANDIDATE_LIMIT", "500")))
    rate_limit_window_seconds: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")))
    rate_limit_login: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_LOGIN", "10")))
    rate_limit_register: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_REGISTER", "5")))
    rate_limit_forgot: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_FORGOT", "5")))
    rate_limit_verify: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_VERIFY", "10")))
    rate_limit_intelligence: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_INTELLIGENCE", "20")))
    gemini_api_key: str = field(default_factory=lambda: integration_setting("GEMINI_API_KEY").strip(), repr=False)
    gemini_model: str = field(default_factory=lambda: integration_setting("GEMINI_MODEL").strip() or "gemini-2.5-flash")
    brevo_api_key: str = field(default_factory=lambda: integration_setting("BREVO_API_KEY").strip(), repr=False)
    brevo_sender_email: str = field(default_factory=lambda: integration_setting("BREVO_SENDER_EMAIL").strip())
    brevo_sender_name: str = field(default_factory=lambda: integration_setting("BREVO_SENDER_NAME", "NagrikSetu").strip())
    supabase_url: str = field(default_factory=lambda: integration_setting("SUPABASE_URL").strip())
    supabase_secret_key: str = field(default_factory=lambda: integration_setting("SUPABASE_SECRET_KEY").strip(), repr=False)
    supabase_storage_bucket: str = field(default_factory=lambda: integration_setting("SUPABASE_STORAGE_BUCKET", "complaint-evidence").strip() or "complaint-evidence")
    evidence_max_bytes: int = field(default_factory=lambda: integration_int("EVIDENCE_MAX_BYTES", 10 * 1024 * 1024))
    cors_origins: list[str] = field(default_factory=lambda: [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ])


def validate_settings(config: Settings):
    """Fail safely before startup can migrate an incorrectly configured database."""
    if config.jwt_algorithm not in {"HS256", "HS384", "HS512"}:
        raise ValueError("JWT_ALGORITHM must be HS256, HS384 or HS512")
    if config.app_env != "development":
        if len(os.getenv("JWT_SECRET", "").strip()) < 32:
            raise ValueError("Configure JWT_SECRET with at least 32 characters outside development")
        try:
            url = make_url(config.database_url)
        except (ArgumentError, ValueError):
            raise ValueError("Configure a valid PostgreSQL DATABASE_URL outside development") from None
        if (url.drivername not in {"postgres", "postgresql", "postgresql+pg8000"}
                or not url.host or not url.database):
            raise ValueError("Configure a PostgreSQL DATABASE_URL outside development; SQLite is for local demos only")
        if url.query.get("sslmode", "verify-full") not in {"require", "verify-full"}:
            raise ValueError("PostgreSQL TLS must be enabled outside development")
        if not config.cors_origins:
            raise ValueError("Configure CORS_ORIGINS with the HTTPS frontend origin outside development")
        for origin in config.cors_origins:
            try:
                parsed = urlsplit(origin)
                valid_port = parsed.port is None or 1 <= parsed.port <= 65535
                valid = (parsed.scheme == "https" and parsed.hostname
                         and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}
                         and not parsed.hostname.endswith(".localhost")
                         and not parsed.username and not parsed.password
                         and not parsed.path and not parsed.query and not parsed.fragment
                         and "*" not in origin and not any(ch.isspace() for ch in origin)
                         and valid_port)
            except ValueError:
                valid = False
            if not valid:
                raise ValueError("CORS_ORIGINS must contain exact HTTPS frontend origins without paths or wildcards outside development")
    if config.access_token_expire_minutes <= 0 or config.otp_expire_minutes <= 0:
        raise ValueError("Token and OTP expiry must be positive")
    if not 0 <= config.duplicate_threshold <= 1:
        raise ValueError("DUPLICATE_THRESHOLD must be between 0 and 1")
    if any(value <= 0 for value in [config.duplicate_lookback_days, config.duplicate_candidate_limit,
        config.rate_limit_window_seconds, config.rate_limit_login, config.rate_limit_register,
        config.rate_limit_forgot, config.rate_limit_verify, config.rate_limit_intelligence]):
        raise ValueError("Rate limits and duplicate search limits must be positive")


settings = Settings()
validate_settings(settings)
