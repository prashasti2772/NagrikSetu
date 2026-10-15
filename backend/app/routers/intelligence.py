from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.rate_limit import rate_limit
from app.core.config import settings
from app.routers.workflow import DB, Authority, get_complaint
from app.schemas.phase3 import AnalyzeComplaint, ComplaintAnalysis
from app.services.intelligence import analyze, duplicates

router = APIRouter(prefix="/api/v1", tags=["intelligence"])

@router.post("/intelligence/analyze-complaint", response_model=ComplaintAnalysis,
             dependencies=[Depends(rate_limit("intelligence", settings.rate_limit_intelligence))])
def analyze_complaint(payload: AnalyzeComplaint, db: DB, user = Depends(get_current_user)):
    return analyze(db, payload.title, payload.description, user, category=payload.category,
                   latitude=payload.latitude, longitude=payload.longitude, address=payload.address)

@router.get("/authority/complaints/{complaint_id}/duplicates")
def complaint_duplicates(complaint_id: int, db: DB, user: Authority):
    c = get_complaint(db, complaint_id, user)
    return {"complaint_id": c.id, "possible_duplicates": duplicates(db, c.title, c.description, user, exclude_id=c.id,
                category=c.category, latitude=c.latitude, longitude=c.longitude, address=c.address),
            "threshold": settings.duplicate_threshold, "lookback_days": settings.duplicate_lookback_days,
            "candidate_limit": settings.duplicate_candidate_limit}
