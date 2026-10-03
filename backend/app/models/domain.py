"""Identity and workflow persistence; timestamps are UTC."""
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Integer, false
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base
from app.models.complaint import utc_now

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="citizen")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    employee_id: Mapped[str | None] = mapped_column(String(100))
    designation: Mapped[str | None] = mapped_column(String(100))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    token_version: Mapped[int] = mapped_column(default=0)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

class PasswordOTP(Base):
    __tablename__ = "password_otps"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    otp_hash: Mapped[str] = mapped_column(String(64))
    expiry: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    attempts: Mapped[int] = mapped_column(default=0)
    reset_hash: Mapped[str | None] = mapped_column(String(64))
    purpose: Mapped[str] = mapped_column(String(30), default="password_reset", server_default="password_reset")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

class Incident(Base):
    """Shared workflow; individual reports, evidence and citizen decisions remain intact."""
    __tablename__ = "incidents"
    id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[str] = mapped_column(String(30), default="submitted")
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    assigned_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), index=True)
    assigned_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text)
    evidence_url: Mapped[str | None] = mapped_column(String(2048))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    old_status: Mapped[str | None] = mapped_column(String(30))
    new_status: Mapped[str] = mapped_column(String(30))
    changed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    action: Mapped[str] = mapped_column(String(50), default="status_changed", server_default="legacy")
    verification_status: Mapped[str | None] = mapped_column(String(20))
    old_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    new_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    old_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    new_officer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

class ComplaintRemark(Base):
    __tablename__ = "complaint_remarks"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    author_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    complaint_id: Mapped[int | None] = mapped_column(ForeignKey("complaints.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

class ComplaintEvidence(Base):
    __tablename__ = "complaint_evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), index=True)
    image_url: Mapped[str | None] = mapped_column(String(2048))
    storage_bucket: Mapped[str | None] = mapped_column(String(255))
    storage_object: Mapped[str | None] = mapped_column(String(1024))
    content_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    evidence_type: Mapped[str] = mapped_column(String(30))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

class ComplaintSuggestion(Base):
    __tablename__ = "complaint_suggestions"
    id: Mapped[int] = mapped_column(primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), unique=True)
    suggested_category: Mapped[str] = mapped_column(String(100))
    suggested_priority: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[float] = mapped_column()
    recommended_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    model_version: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
