from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.rate_limit import rate_limit
from app.core.config import settings
from app.routers.workflow import DB, Authority, get_complaint
from app.schemas.phase3 import AnalyzeComplaint
from app.services.intelligence import analyze, duplicates

router = APIRouter(prefix="/api/v1", tags=["intelligence"])

@router.post("/intelligence/analyze-complaint", dependencies=[Depends(rate_limit("intelligence", settings.rate_limit_intelligence))])
def analyze_complaint(payload: AnalyzeComplaint, db: DB, user = Depends(get_current_user)):
    # Coordinates are accepted for future geographic matching, not scored in this version.
    return analyze(db, payload.title, payload.description, user)

@router.get("/authority/complaints/{complaint_id}/duplicates")
def complaint_duplicates(complaint_id: int, db: DB, user: Authority):
    c = get_complaint(db, complaint_id, user)
    return {"complaint_id": c.id, "possible_duplicates": duplicates(db, c.title, c.description, user, exclude_id=c.id),
            "threshold": settings.duplicate_threshold, "lookback_days": settings.duplicate_lookback_days,
            "candidate_limit": settings.duplicate_candidate_limit}
