"""Complaint persistence model. All timestamps are stored in UTC."""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, Enum as SQLAlchemyEnum, Float, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class ComplaintStatus(str, Enum):
    submitted = "submitted"
    under_review = "under_review"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    verification_pending = "verification_pending"
    reopened = "reopened"


def utc_now() -> datetime:
    # SQLite stores naive datetimes; the response schema adds the UTC offset.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    address: Mapped[str] = mapped_column(String(500))
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    status: Mapped[ComplaintStatus] = mapped_column(
        SQLAlchemyEnum(ComplaintStatus, native_enum=False, create_constraint=True),
        default=ComplaintStatus.submitted,
    )
    assigned_department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)
    citizen_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    assigned_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    assigned_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    priority: Mapped[str] = mapped_column(String(20), default="medium", server_default="medium")
    resolution_notes: Mapped[str | None] = mapped_column(Text)
    evidence_url: Mapped[str | None] = mapped_column(String(2048))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    verification_status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
