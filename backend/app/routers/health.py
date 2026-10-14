from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse

from app.core.config import integration_setting, settings
from app.db.database import check_database_connection, engine
from app.services.storage import SupabaseStorage, get_evidence_storage


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


@router.get("/health/integrations")
def integration_configuration(response: Response):
    """Configuration presence only: never contact a provider or disclose values."""
    def state(configured):
        return {"status": "configured" if configured else "not_configured"}

    response.headers["Cache-Control"] = "no-store"
    return {
        "check": "configuration_only",
        "live_checks_performed": False,
        "integrations": {
            "gemini": state(bool(settings.gemini_api_key)),
            # Constructing this adapter validates local configuration only.
            "storage": state(isinstance(get_evidence_storage(), SupabaseStorage)),
            "email": state(bool(integration_setting("BREVO_API_KEY").strip()
                                and integration_setting("BREVO_SENDER_EMAIL").strip())),
            "bhashini": {"status": "not_configured", "pending_approval": True},
        },
    }
