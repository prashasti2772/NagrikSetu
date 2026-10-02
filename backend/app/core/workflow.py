from fastapi import HTTPException
from sqlalchemy import or_
from app.models.complaint import Complaint, ComplaintStatus, utc_now
from app.models.domain import ComplaintStatusHistory
from app.services.notifications import workflow_notifications

# Authorities work within their department or their explicit officer assignments.
# Administrators can route any complaint, including anonymous legacy reports.
def scope(user):
    if user.role == "admin":
        return True
    conditions = [Complaint.assigned_officer_id == user.id]
    if user.department_id is not None:
        conditions.append(Complaint.assigned_department_id == user.department_id)
    return or_(*conditions)

def permitted(complaint, user):
    if user.role == "admin":
        return
    if user.role == "citizen" and complaint.citizen_id == user.id:
        return
    if user.role == "authority" and (complaint.assigned_officer_id == user.id or
        (user.department_id is not None and complaint.assigned_department_id == user.department_id)):
        return
    raise HTTPException(403, "Complaint access denied")

def record(db, complaint, user, old_status, remarks=None, event=None):
    db.add(ComplaintStatusHistory(complaint_id=complaint.id, old_status=old_status,
        new_status=complaint.status, changed_by_user_id=user.id if user else None, remarks=remarks))
    complaint.updated_at = utc_now()
    workflow_notifications(db, complaint, old_status, event)

TRANSITIONS = {
    "submitted": {"under_review", "assigned"},
    "under_review": {"assigned", "in_progress"},
    "assigned": {"under_review", "in_progress"},
    "in_progress": {"under_review"},
    "reopened": {"under_review", "assigned", "in_progress"},
}

def change_status(db, complaint, user, status):
    permitted(complaint, user)
    if status not in TRANSITIONS.get(complaint.status, set()):
        raise HTTPException(409, "Invalid transition; use resolve, verify or reopen for resolution workflow")
    if status == "assigned" and not (complaint.assigned_department_id or complaint.assigned_officer_id):
        raise HTTPException(409, "Assign a department or officer first")
    old = complaint.status
    complaint.status = ComplaintStatus(status)
    record(db, complaint, user, old)
