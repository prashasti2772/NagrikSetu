from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from app.routers.workflow import DB
from app.core.security import get_current_user
from app.models.domain import Notification
from app.schemas.phase3 import NotificationRead

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

@router.get("", response_model=list[NotificationRead])
def notifications(db: DB, user = Depends(get_current_user), is_read: bool | None = None,
                  offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    query = select(Notification).where(Notification.user_id == user.id)
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
    return db.scalars(query.order_by(Notification.id.desc()).offset(offset).limit(limit)).all()

@router.patch("/read-all")
def read_all(db: DB, user = Depends(get_current_user)):
    result = db.execute(update(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False)).values(is_read=True))
    db.commit()
    return {"updated": result.rowcount}

@router.patch("/{notification_id}/read", response_model=NotificationRead)
def read_notification(notification_id: int, db: DB, user = Depends(get_current_user)):
    n = db.scalar(select(Notification).where(Notification.id == notification_id, Notification.user_id == user.id))
    if n is None:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n
