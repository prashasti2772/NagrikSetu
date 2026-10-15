from typing import Literal
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, or_, func, case
from sqlalchemy.exc import IntegrityError
from app.routers.workflow import DB, Admin, save
from app.models.domain import User, Department
from app.models.complaint import Complaint
from app.schemas.domain import UserRead
from app.schemas.phase3 import AuthorityCreate, UserPatch
from app.core.security import password_hasher

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
ACTIVE_STATUSES = ["submitted", "under_review", "assigned", "in_progress", "verification_pending", "reopened"]

def get_user(db, user_id):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    return user

def active_department(db, department_id):
    d = db.get(Department, department_id) if department_id else None
    if not d or not d.is_active:
        raise HTTPException(422, "An active department is required")
    return d

@router.get("/users", response_model=list[UserRead])
def users(db: DB, admin: Admin, role: Literal["citizen", "authority", "admin"] | None = None,
          department: int | None = Query(None, gt=0), is_active: bool | None = None,
          search: str | None = Query(None, max_length=200), offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    query = select(User)
    for column, value in [(User.role, role), (User.department_id, department), (User.is_active, is_active)]:
        if value is not None:
            query = query.where(column == value)
    if search:
        query = query.where(or_(User.full_name.icontains(search, autoescape=True),
                                User.email.icontains(search, autoescape=True), User.employee_id.icontains(search, autoescape=True)))
    return db.scalars(query.order_by(User.id).offset(offset).limit(limit)).all()

@router.get("/users/{user_id}", response_model=UserRead)
def user_detail(user_id: int, db: DB, admin: Admin):
    return get_user(db, user_id)

@router.post("/authorities", response_model=UserRead, status_code=201)
def create_authority(payload: AuthorityCreate, db: DB, admin: Admin):
    active_department(db, payload.department_id)
    officer = User(**payload.model_dump(exclude={"temporary_password"}), role="authority",
                   password_hash=password_hasher.hash(payload.temporary_password))
    db.add(officer)
    try:
        return save(db, officer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered") from None

@router.patch("/users/{user_id}", response_model=UserRead)
def patch_user(user_id: int, payload: UserPatch, db: DB, admin: Admin):
    user = get_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    if not data or ("is_active" in data and data["is_active"] is None):
        raise HTTPException(422, "Provide valid update fields")
    if user.id == admin.id and data.get("is_active") is False:
        raise HTTPException(409, "Cannot deactivate your own admin account")
    if "department_id" in data:
        if user.role == "citizen":
            raise HTTPException(422, "Citizens cannot be assigned staff departments")
        if data["department_id"] is not None or user.role == "authority":
            active_department(db, data["department_id"])
    changes_access = ("department_id" in data and data["department_id"] != user.department_id) or (
        data.get("is_active") is False and user.is_active)
    if changes_access and user.role == "authority":
        active = db.scalar(select(func.count()).select_from(Complaint).where(
            Complaint.assigned_officer_id == user.id, Complaint.status.in_(ACTIVE_STATUSES)))
        if active:
            raise HTTPException(409, "Reassign active complaints before transferring or deactivating an officer")
    for key, value in data.items():
        setattr(user, key, value)
    if changes_access:
        user.token_version += 1
    return save(db, user)

@router.get("/officers")
def officers(db: DB, admin: Admin, department: int | None = Query(None, gt=0),
             is_active: bool | None = None, offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    workloads = select(Complaint.assigned_officer_id.label("officer_id"),
        func.sum(case((Complaint.status.in_(ACTIVE_STATUSES), 1), else_=0)).label("active"),
        func.sum(case((Complaint.status == "resolved", 1), else_=0)).label("resolved")
    ).group_by(Complaint.assigned_officer_id).subquery()
    query = select(User, Department.name, func.coalesce(workloads.c.active, 0), func.coalesce(workloads.c.resolved, 0)).outerjoin(
        Department, User.department_id == Department.id).outerjoin(workloads, User.id == workloads.c.officer_id).where(User.role == "authority")
    if department is not None:
        query = query.where(User.department_id == department)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    return [{**UserRead.model_validate(u).model_dump(), "department": d,
             "active_assignments": active, "resolved_complaints": resolved,
             "current_status": "inactive" if not u.is_active else ("busy" if active else "available")}
            for u, d, active, resolved in db.execute(query.order_by(User.id).offset(offset).limit(limit))]
