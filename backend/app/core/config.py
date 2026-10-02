"""Small, environment-based configuration with local development defaults."""

import os
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
    cors_origins: list[str] = field(default_factory=lambda: [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ])


settings = Settings()
