"""Workflow notifications participate in the same transaction as their event."""
from app.models.domain import Notification

def notify(db, user_id, complaint, event, title, message):
    if user_id is not None:
        db.add(Notification(user_id=user_id, complaint_id=complaint.id, type=event, title=title, message=message))

def workflow_notifications(db, complaint, old_status, event=None):
    status = complaint.status
    if event is None:
        if old_status is None:
            event = "complaint_submitted"
        elif status == "verification_pending" and old_status != status:
            event = "resolution_submitted"
        elif status == "reopened" and old_status != status:
            event = "complaint_reopened"
        elif status != old_status:
            event = "status_changed"
        else:
            return
    title = event.replace("_", " ").capitalize()
    message = f"Complaint #{complaint.id}: {title.lower()} (status: {status.value if hasattr(status, 'value') else status})."
    for uid in {complaint.citizen_id, complaint.assigned_officer_id} - {None}:
        notify(db, uid, complaint, event, title, message)
    if event == "resolution_submitted":
        notify(db, complaint.citizen_id, complaint, "verification_required", "Please verify resolution",
               f"Confirm whether complaint #{complaint.id} has been resolved.")
