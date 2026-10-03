from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, StringConstraints, UrlConstraints, field_validator
from app.schemas.complaint import Severity

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]
Password = Annotated[str, StringConstraints(min_length=10, max_length=128)]

class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")

class EmailInput(Input):
    email: EmailStr
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return str(value).lower()

class Register(EmailInput):
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    password: Password
    phone: str | None = Field(default=None, max_length=30)

class ProfilePatch(Input):
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)] | None = None
    phone: str | None = Field(default=None, max_length=30)

class Login(EmailInput):
    password: str = Field(min_length=1, max_length=128)

class OTPVerify(EmailInput):
    otp: str = Field(pattern=r"^\d{6}$")

class EmailVerification(Input):
    otp: str = Field(pattern=r"^[0-9]{6}$")

class Reset(Input):
    reset_token: str = Field(min_length=20, max_length=200)
    new_password: Password

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: str
    phone: str | None
    role: str
    is_active: bool
    email_verified: bool
    employee_id: str | None
    designation: str | None
    department_id: int | None
    created_at: datetime
    updated_at: datetime

class DepartmentCreate(Input):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    description: str | None = Field(default=None, max_length=10000)
    is_active: bool = True

class DepartmentPatch(Input):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)] | None = None
    description: str | None = Field(default=None, max_length=10000)
    is_active: bool | None = None

class DepartmentRead(DepartmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int

class Assignment(Input):
    assigned_department_id: int | None = Field(default=None, gt=0)
    assigned_officer_id: int | None = Field(default=None, gt=0)
    priority: Severity | None = None

class Remark(Input):
    text: Text

class Resolution(Input):
    resolution_notes: Text
    evidence_url: Annotated[HttpUrl, UrlConstraints(max_length=2048)] | None = None

class Verification(Input):
    resolved: bool
    feedback: Text | None = None

class HistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complaint_id: int
    old_status: str | None
    new_status: str
    changed_by_user_id: int | None
    remarks: str | None
    created_at: datetime

    action: str
    verification_status: str | None
    old_department_id: int | None
    new_department_id: int | None
    old_officer_id: int | None
    new_officer_id: int | None

class RemarkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    complaint_id: int
    author_user_id: int
    text: str
    created_at: datetime
