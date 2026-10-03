from datetime import datetime, timezone
from typing import Annotated
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_serializer
from app.schemas.domain import Input
from app.models.complaint import ComplaintStatus

class ChatMessage(Input):
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    complaint_id: int | None = Field(default=None, gt=0, le=2147483647)

class ComplaintSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    status: ComplaintStatus
    verification_status: str
    updated_at: datetime

    @field_serializer("updated_at")
    def utc_timestamp(self, value):
        return value.replace(tzinfo=timezone.utc).isoformat()

class ChatReply(BaseModel):
    answer: str
    topic: str
    suggestions: list[str]
    complaint: ComplaintSnapshot | None = None

class DraftComplaint(BaseModel):
    title: str
    description: str

class ChatbotAnalyzeReply(BaseModel):
    assistant_message: str
    draft_complaint: DraftComplaint
    suggested_category: str
    suggested_department: dict[str, int | str] | None
    suggested_priority: Literal["low", "medium", "high", "critical"]
    possible_duplicates: list[dict[str, int | float | str]]
    reasons: dict[str, str]
    ai_provider: Literal["gemini", "local"]
    requires_user_confirmation: Literal[True] = True
