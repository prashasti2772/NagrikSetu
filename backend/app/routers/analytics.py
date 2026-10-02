from datetime import date, datetime, time, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from app.routers.workflow import DB, Authority, counts
from app.core.workflow import scope
from app.models.complaint import Complaint
from app.models.domain import Department

router = APIRouter(prefix="/api/v1/authority/analytics", tags=["analytics"])

def date_range(date_from: date | None = None, date_to: date | None = None):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, "date_from must be on or before date_to")
    conditions = []
    if date_from:
        conditions.append(Complaint.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        if date_to == date.max:
            conditions.append(Complaint.created_at <= datetime.max)
        else:
            conditions.append(Complaint.created_at < datetime.combine(date_to + timedelta(days=1), time.min))
    return conditions

@router.get("/summary")
def summary(db: DB, user: Authority, dates = Depends(date_range)):
    from sqlalchemy import and_
    result = counts(db, and_(scope(user), *dates))
    # Dialect-specific duration expression; all aggregation remains in the database.
    if db.get_bind().dialect.name == "sqlite":
        hours = (func.julianday(Complaint.resolved_at) - func.julianday(Complaint.created_at)) * 24
    else:
        hours = func.extract("epoch", Complaint.resolved_at - Complaint.created_at) / 3600.0
    avg, samples = db.execute(select(func.avg(hours), func.count()).select_from(Complaint).where(
        scope(user), *dates, Complaint.status == "resolved", Complaint.resolved_at.is_not(None),
        Complaint.resolved_at >= Complaint.created_at)).one()
    result["average_resolution_hours"] = float(avg) if avg is not None else None
    result["resolution_sample_count"] = samples
    return result

@router.get("/categories")
def categories(db: DB, user: Authority, dates = Depends(date_range)):
    rows = db.execute(select(Complaint.category, func.count()).where(scope(user), *dates)
                      .group_by(Complaint.category).order_by(Complaint.category))
    return [{"category": category, "total": total} for category, total in rows]

@router.get("/departments")
def departments(db: DB, user: Authority, dates = Depends(date_range)):
    rows = db.execute(select(Complaint.assigned_department_id, Department.name, func.count()).outerjoin(
        Department, Complaint.assigned_department_id == Department.id).where(scope(user), *dates)
        .group_by(Complaint.assigned_department_id, Department.name).order_by(Complaint.assigned_department_id))
    return [{"department_id": did, "department": name or "Unassigned", "total": total} for did, name, total in rows]

@router.get("/trends")
def trends(db: DB, user: Authority, dates = Depends(date_range)):
    day = func.date(Complaint.created_at)
    rows = db.execute(select(day, func.count()).where(scope(user), *dates).group_by(day).order_by(day))
    return [{"date": str(day), "total": total} for day, total in rows]
