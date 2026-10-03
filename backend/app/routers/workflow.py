from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import require_admin, require_authority, require_citizen, get_current_user
from app.core.workflow import scope, permitted, record, change_status
from app.models.complaint import Complaint, ComplaintStatus, utc_now
from app.models.domain import Department, User, ComplaintRemark, ComplaintStatusHistory, ComplaintEvidence
from app.schemas.complaint import ComplaintRead, ComplaintStatusUpdate, Severity
from app.schemas.domain import (DepartmentCreate, DepartmentPatch, DepartmentRead, Assignment, Remark,
    Resolution, Verification, HistoryRead, RemarkRead, UserRead)

router = APIRouter(prefix="/api/v1", tags=["workflow"])
DB = Annotated[Session, Depends(get_db)]
Authority = Annotated[User, Depends(require_authority)]
Citizen = Annotated[User, Depends(require_citizen)]
Admin = Annotated[User, Depends(require_admin)]

def get_complaint(db, complaint_id, user):
    c = db.get(Complaint, complaint_id)
    if not c:
        raise HTTPException(404, "Complaint not found")
    permitted(c, user)
    return c

def save(db, c):
    db.commit()
    db.refresh(c)
    return c

def counts(db, condition):
    rows = db.execute(select(Complaint.status, func.count()).where(condition).group_by(Complaint.status))
    result = {s.value: 0 for s in ComplaintStatus}
    result.update({s.value: n for s, n in rows})
    result["total"] = sum(result.values())
    return result

@router.get("/departments", response_model=list[DepartmentRead])
def departments(db: DB):
    return db.scalars(select(Department).where(Department.is_active.is_(True)).order_by(Department.id)).all()

@router.get("/admin/departments", response_model=list[DepartmentRead])
def admin_departments(db: DB, user: Admin, is_active: bool | None = None):
    query = select(Department)
    if is_active is not None:
        query = query.where(Department.is_active == is_active)
    return db.scalars(query.order_by(Department.id)).all()

@router.post("/admin/departments", response_model=DepartmentRead, status_code=201)
def create_department(payload: DepartmentCreate, db: DB, user: Admin):
    d = Department(**payload.model_dump())
    db.add(d)
    try:
        return save(db, d)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Department name already exists") from None

@router.patch("/admin/departments/{department_id}", response_model=DepartmentRead)
def patch_department(department_id: int, payload: DepartmentPatch, db: DB, user: Admin):
    d = db.get(Department, department_id)
    if not d:
        raise HTTPException(404, "Department not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is None and key != "description":
            raise HTTPException(422, "Name and is_active cannot be null")
        setattr(d, key, value)
    try:
        return save(db, d)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Department name already exists") from None

@router.get("/users/me/complaints", response_model=list[ComplaintRead])
def my_complaints(db: DB, user: Citizen, offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    return db.scalars(select(Complaint).where(Complaint.citizen_id == user.id).order_by(Complaint.id.desc()).offset(offset).limit(limit)).all()

@router.get("/users/me/dashboard")
def my_dashboard(db: DB, user: Citizen):
    result = counts(db, Complaint.citizen_id == user.id)
    result["submitted_under_review"] = result["submitted"] + result["under_review"]
    return result

@router.get("/authority/dashboard")
def authority_dashboard(db: DB, user: Authority):
    result = counts(db, scope(user))
    recent = db.scalars(select(Complaint).where(scope(user)).order_by(Complaint.updated_at.desc()).limit(10)).all()
    result["recent_complaints"] = [ComplaintRead.model_validate(c) for c in recent]
    return result

@router.get("/authority/officers", response_model=list[UserRead])
def authority_officers(db: DB, user: Authority, department: int | None = Query(None, gt=0),
                       is_active: bool = True):
    department_id = department if user.role == "admin" else user.department_id
    if user.role != "admin" and department_id is None:
        return []
    if user.role != "admin" and department is not None and department != user.department_id:
        raise HTTPException(403, "Officers are limited to your department")
    query = select(User).where(User.role == "authority", User.is_active == is_active)
    if department_id is not None:
        query = query.where(User.department_id == department_id)
    return db.scalars(query.order_by(User.full_name, User.id)).all()

@router.get("/authority/complaints", response_model=list[ComplaintRead])
def authority_complaints(db: DB, user: Authority, category: str | None = None,
    priority: Severity | None = None, status: ComplaintStatus | None = None,
    department: int | None = Query(None, gt=0), location: str | None = None,
    area: str | None = None, assigned_officer: int | None = Query(None, gt=0),
    offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    query = select(Complaint).where(scope(user))
    for column, value in [(Complaint.category, category), (Complaint.priority, priority),
                          (Complaint.status, status), (Complaint.assigned_department_id, department),
                          (Complaint.assigned_officer_id, assigned_officer)]:
        if value is not None:
            query = query.where(column == value)
    if area:
        query = query.where(or_(Complaint.area.icontains(area, autoescape=True),
                                Complaint.locality.icontains(area, autoescape=True),
                                Complaint.ward.icontains(area, autoescape=True),
                                Complaint.address.icontains(area, autoescape=True)))
    elif location:
        query = query.where(Complaint.address.icontains(location, autoescape=True))
    return db.scalars(query.order_by(Complaint.id.desc()).offset(offset).limit(limit)).all()

@router.get("/authority/complaints/{complaint_id}", response_model=ComplaintRead)
def authority_detail(complaint_id: int, db: DB, user: Authority):
    return get_complaint(db, complaint_id, user)

@router.patch("/authority/complaints/{complaint_id}/assign", response_model=ComplaintRead)
def assign(complaint_id: int, payload: Assignment, db: DB, user: Authority):
    c = get_complaint(db, complaint_id, user)
    data = payload.model_dump(exclude_unset=True)
    if not data or ("priority" in data and data["priority"] is None):
        raise HTTPException(422, "Provide valid assignment fields")
    if c.status in {"resolved", "verification_pending"}:
        raise HTTPException(409, "Reopen complaint before reassigning")
    department_id = data.get("assigned_department_id", c.assigned_department_id)
    officer_id = data.get("assigned_officer_id", c.assigned_officer_id)
    if user.role != "admin" and department_id != user.department_id:
        raise HTTPException(403, "Only admins can transfer departments")
    department = db.get(Department, department_id) if department_id else None
    if department_id and (not department or not department.is_active):
        raise HTTPException(422, "Invalid department")
    officer = db.get(User, officer_id) if officer_id else None
    if officer_id and (not officer or not officer.is_active or officer.role != "authority" or officer.department_id != department_id):
        raise HTTPException(422, "Officer must be active authority in the assigned department")
    old = c.status
    old_assignment = (c.assigned_department_id, c.assigned_officer_id)
    for key, value in data.items():
        setattr(c, key, value)
    c.assigned_department = department.name if department else None
    if department_id or officer_id:
        c.status = ComplaintStatus.assigned
    elif c.status == "assigned":
        c.status = ComplaintStatus.under_review
    record(db, c, user, old, "Assignment updated", event="complaint_assigned", old_assignment=old_assignment)
    return save(db, c)

@router.patch("/authority/complaints/{complaint_id}/status", response_model=ComplaintRead)
def status_update(complaint_id: int, payload: ComplaintStatusUpdate, db: DB, user: Authority):
    c = get_complaint(db, complaint_id, user)
    change_status(db, c, user, payload.status)
    return save(db, c)

@router.post("/authority/complaints/{complaint_id}/remarks", response_model=RemarkRead, status_code=201)
def remark(complaint_id: int, payload: Remark, db: DB, user: Authority):
    c = get_complaint(db, complaint_id, user)
    r = ComplaintRemark(complaint_id=c.id, author_user_id=user.id, text=payload.text)
    db.add(r)
    record(db, c, user, c.status, payload.text, action="remark_added")
    return save(db, r)

@router.post("/authority/complaints/{complaint_id}/resolve", response_model=ComplaintRead)
def resolve(complaint_id: int, payload: Resolution, db: DB, user: Authority):
    c = get_complaint(db, complaint_id, user)
    if c.status not in {"assigned", "in_progress", "reopened", "under_review"}:
        raise HTTPException(409, "Complaint cannot be resolved from its current state")
    old = c.status
    c.status = ComplaintStatus.verification_pending
    c.verification_status = "pending"
    c.resolution_notes = payload.resolution_notes
    c.evidence_url = str(payload.evidence_url) if payload.evidence_url else None
    c.resolved_at = utc_now()
    if c.evidence_url:
        evidence = ComplaintEvidence(complaint_id=c.id, image_url=c.evidence_url,
                                     evidence_type="resolution", uploaded_by=user.id)
        db.add(evidence)
        from app.services.incidents import share_resolution_evidence
        share_resolution_evidence(db, evidence)
    record(db, c, user, old, payload.resolution_notes, action="resolution_submitted")
    return save(db, c)

@router.post("/authority/complaints/{complaint_id}/reopen", response_model=ComplaintRead)
def reopen(complaint_id: int, db: DB, user: Authority):
    c = get_complaint(db, complaint_id, user)
    if c.status not in {"resolved", "verification_pending"}:
        raise HTTPException(409, "Only resolved or verification-pending complaints can reopen")
    old = c.status
    c.status = ComplaintStatus.reopened
    c.verification_status = "reopened"
    c.resolved_at = None
    record(db, c, user, old, "Reopened by authority", action="complaint_reopened")
    return save(db, c)

@router.post("/complaints/{complaint_id}/verify", response_model=ComplaintRead)
def verify_complaint(complaint_id: int, payload: Verification, db: DB, user: Citizen):
    c = get_complaint(db, complaint_id, user)
    if c.status != "verification_pending":
        raise HTTPException(409, "Complaint is not awaiting verification")
    old = c.status
    c.status = ComplaintStatus.resolved if payload.resolved else ComplaintStatus.reopened
    c.verification_status = "approved" if payload.resolved else "rejected"
    if not payload.resolved:
        c.resolved_at = None
    record(db, c, user, old, payload.feedback, action="citizen_verification")
    return save(db, c)

@router.get("/complaints/{complaint_id}/timeline", response_model=list[HistoryRead])
def timeline(complaint_id: int, db: DB, user: User = Depends(get_current_user)):
    get_complaint(db, complaint_id, user)
    return db.scalars(select(ComplaintStatusHistory).where(ComplaintStatusHistory.complaint_id == complaint_id)
                      .order_by(ComplaintStatusHistory.id)).all()
