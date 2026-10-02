from fastapi import APIRouter, HTTPException

from app.db.database import check_database_connection


router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/db")
def database_health():
    if not check_database_connection():
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok", "database": "connected"}
