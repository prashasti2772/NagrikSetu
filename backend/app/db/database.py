"""Shared database setup for local SQLite and PostgreSQL via pg8000."""

import os
import ssl

import certifi

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import ArgumentError, SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def verified_ssl_context() -> ssl.SSLContext:
    """Trust certifi's CA bundle, plus an explicitly configured private root CA."""
    context = ssl.create_default_context(cafile=certifi.where())
    custom_ca = os.getenv("SSL_CERT_FILE", "").strip()
    if custom_ca:
        context.load_verify_locations(cafile=custom_ca)
    return context


def build_engine(database_url: str) -> Engine:
    try:
        url = make_url(database_url)
    except (ArgumentError, ValueError):
        raise ValueError("DATABASE_URL must be a valid SQLite or PostgreSQL URL") from None

    if url.drivername in {"postgres", "postgresql", "postgresql+pg8000"}:
        url = url.set(drivername="postgresql+pg8000")
        # pg8000 takes an SSLContext, not libpq's sslmode argument.
        ssl_mode = url.query.get("sslmode", "verify-full")
        if ssl_mode not in {"require", "verify-full", "disable"}:
            raise ValueError("Supported sslmode values: require, verify-full, disable")
        url = url.difference_update_query(["sslmode"])
        return create_engine(
            url,
            pool_pre_ping=True,
            hide_parameters=True,
            connect_args={
                "ssl_context": False if ssl_mode == "disable" else verified_ssl_context(),
                "timeout": 10,
            },
        )

    if url.drivername in {"sqlite", "sqlite+pysqlite"}:
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            hide_parameters=True,
        )

    raise ValueError("DATABASE_URL must use SQLite or PostgreSQL with pg8000")


engine = build_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


def get_db():
    with SessionLocal() as session:
        yield session


def check_database_connection() -> bool:
    """Run a minimal query without returning connection details or errors."""
    try:
        with engine.connect() as connection:
            return connection.scalar(text("SELECT 1")) == 1
    except (SQLAlchemyError, OSError):
        return False
