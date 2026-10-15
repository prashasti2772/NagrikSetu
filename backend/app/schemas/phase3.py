from datetime import datetime
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, HttpUrl, UrlConstraints
from app.schemas.domain import EmailInput, Input, Password
from app.schemas.complaint import Title, Description, ShortText, Address, Severity

class AuthorityCreate(EmailInput):
    full_name: Title
    employee_id: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    designation: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    department_id: int = Field(gt=0)
    temporary_password: Password

class UserPatch(Input):
    department_id: int | None = Field(default=None, gt=0)
    designation: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None

class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    complaint_id: int | None
    created_at: datetime

class AnalyzeComplaint(Input):
    title: Title
    description: Description
    category: ShortText | None = None
    address: Address | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)

class DepartmentSuggestion(BaseModel):
    id: int
    name: str

class PossibleDuplicate(BaseModel):
    complaint_id: int
    similarity: float = Field(ge=0, le=1)
    reason: str

class ComplaintAnalysis(BaseModel):
    suggested_category: str
    confidence: float = Field(ge=0, le=1)
    category_keywords: list[str]
    confidence_method: str
    suggested_priority: Severity
    priority_signals: list[str]
    priority_reason: str
    suggested_department: DepartmentSuggestion | None
    recommended_department: DepartmentSuggestion | None
    possible_duplicates: list[PossibleDuplicate]
    duplicate_similarity_method: str
    reasons: dict[str, str]
    model_version: str
    limitations: str

class EvidenceCreate(Input):
    image_url: Annotated[HttpUrl, UrlConstraints(max_length=2048)]
    evidence_type: Literal["report", "resolution", "supporting"] = "supporting"

class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complaint_id: int
    image_url: str | None
    evidence_type: str
    uploaded_at: datetime
    uploaded_by: int | None
    content_type: str | None = None
    size_bytes: int | None = None


class EvidenceAccess(BaseModel):
    evidence_id: int
    signed_url: str
    expires_in: int
