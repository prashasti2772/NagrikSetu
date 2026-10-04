from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.db.database import check_database_connection, engine


router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/health/db")
def database_health():
    if not check_database_connection():
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok", "database": "connected"}

@router.get("/health/ready")
def readiness():
    connected = check_database_connection()
    return JSONResponse(status_code=200 if connected else 503, content={
        "status": "ok" if connected else "unavailable",
        "database": {"provider": engine.dialect.name, "connected": connected}})
