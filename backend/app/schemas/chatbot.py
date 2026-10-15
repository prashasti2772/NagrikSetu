from datetime import datetime, timezone
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, StrictBool, field_serializer
from app.schemas.domain import Input
from app.schemas.complaint import Title, Description, ShortText, Address, Severity
from app.schemas.language import LanguageTag
from app.models.complaint import ComplaintStatus

Intent = Literal["general_help", "faq", "complaint_draft", "complaint_analysis", "complaint_create",
                 "complaint_status", "incident_status", "evidence_help", "location_help",
                 "resolution_help", "reopen_help", "identity_help", "unknown"]

class ChatDraftPatch(Input):
    title: Title | None = None
    description: Description | None = None
    category: ShortText | None = None
    severity: Severity | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    location_accuracy_m: float | None = Field(default=None, ge=0, le=100000, allow_inf_nan=False)
    location_text: Address | None = None
    locality: ShortText | None = None
    area: ShortText | None = None
    ward: ShortText | None = None
    evidence_id: int | None = Field(default=None, gt=0, le=2147483647)

class ChatMessage(Input):
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    complaint_id: int | None = Field(default=None, gt=0, le=2147483647)
    requested_language: LanguageTag | None = None
    intent: Intent | None = None
    action: Literal["message", "update_draft", "confirm", "cancel"] = "message"
    draft_id: str | None = Field(default=None, pattern=r"^[0-9a-f]{32}$")
    draft_version: int | None = Field(default=None, ge=1)
    confirm: StrictBool = False
    draft: ChatDraftPatch | None = None
    selection_offset: int = Field(default=0, ge=0, le=100000)

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

class ConversationFields(BaseModel):
    message: str = ""
    intent: Intent = "general_help"
    language: str = "en"
    requested_language: str | None = None
    detected_language: str = "und"
    response_language: str = "en"
    translation_used: bool = False
    suggested_category: str | None = None
    suggested_department: dict[str, int | str] | None = None
    suggested_priority: Severity | None = None
    confidence: float | None = None
    reasons: dict[str, str] = Field(default_factory=dict)
    missing_fields: list[str] = Field(default_factory=list)
    possible_duplicates: list[dict] = Field(default_factory=list)
    same_incident_candidates: list[dict] = Field(default_factory=list)
    complaint_draft: dict | None = None
    draft_id: str | None = None
    draft_version: int | None = None
    draft_expires_in: int | None = None
    complaint_id: int | None = None
    incident_id: int | None = None
    status_summary: dict | None = None
    timeline_summary: list[dict] = Field(default_factory=list)
    selections: list[dict] = Field(default_factory=list)
    selection_has_more: bool = False
    requires_confirmation: bool = False
    suggested_actions: list[str] = Field(default_factory=list)
    provider_used: Literal["local", "gemini"] = "local"
    fallback_used: bool = True
    error_code: str | None = None

class ChatReply(ConversationFields):
    answer: str
    topic: str
    suggestions: list[str]
    complaint: ComplaintSnapshot | None = None

class DraftComplaint(BaseModel):
    title: str
    description: str

class ChatbotAnalyzeReply(ConversationFields):
    assistant_message: str
    draft_complaint: DraftComplaint
    suggested_category: str
    suggested_department: dict[str, int | str] | None
    suggested_priority: Severity
    possible_duplicates: list[dict]
    reasons: dict[str, str]
    ai_provider: Literal["gemini", "local"]
    requires_user_confirmation: Literal[True] = True
