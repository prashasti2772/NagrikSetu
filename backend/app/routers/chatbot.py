from math import isfinite
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from app.core.config import settings
from app.core.rate_limit import rate_limit
from app.core.security import optional_user
from app.routers.workflow import DB, get_complaint
from app.core.workflow import scope
from app.models.complaint import Complaint
from app.schemas.chatbot import ChatMessage, ChatReply, ChatbotAnalyzeReply
from app.schemas.phase3 import AnalyzeComplaint
from app.services.chatbot import local_issue_draft, reply
from app.services.gemini import get_gemini_service, sanitize_user_text
from app.services.image_validation import ImageValidationError, validate_image
from app.services.intelligence import analyze

router = APIRouter(prefix="/api/v1/chatbot", tags=["chatbot"])

@router.post("/message", response_model=ChatReply,
             dependencies=[Depends(rate_limit("chatbot", settings.rate_limit_intelligence))])
def message(payload: ChatMessage, db: DB, user = Depends(optional_user), gemini=Depends(get_gemini_service)):
    return reply(db, payload, user, gemini)


MAX_IMAGE_BYTES = 5 * 1024 * 1024
def image_mime(data, declared_type):
    try:
        validate_image(data, declared_type, max_bytes=MAX_IMAGE_BYTES, allow_gif=True)
    except ImageValidationError as exc:
        # Preserve the existing chatbot contract (storage uses its own 422 errors).
        raise HTTPException(413 if exc.status_code == 413 else 415, exc.detail) from None
    return declared_type.strip().lower()


@router.post("/analyze", response_model=ChatbotAnalyzeReply,
             dependencies=[Depends(rate_limit("chatbot-analyze", settings.rate_limit_intelligence))])
async def analyze_input(message: Annotated[str | None, Form()] = None,
                        image: Annotated[UploadFile | None, File()] = None,
                        latitude: Annotated[float | None, Form()] = None,
                        longitude: Annotated[float | None, Form()] = None,
                        complaint_id: Annotated[int | None, Form(gt=0, le=2147483647)] = None,
                        db: DB = None, user=Depends(optional_user), gemini=Depends(get_gemini_service)):
    clean_message = (message or "").strip()
    if len(clean_message) > 2000:
        raise HTTPException(422, "Message must be at most 2000 characters")
    if not clean_message and image is None:
        raise HTTPException(422, "Provide message text or an image")
    for coordinate, lower, upper, field_name in (
        (latitude, -90, 90, "latitude"), (longitude, -180, 180, "longitude"),
    ):
        if coordinate is not None and (not isfinite(coordinate) or not lower <= coordinate <= upper):
            raise HTTPException(422, f"Invalid {field_name}")

    if complaint_id is not None:
        if user is None:
            raise HTTPException(401, "Sign in to reference a complaint")
        condition = Complaint.citizen_id == user.id if user.role == "citizen" else scope(user)
        visible_id = db.scalar(select(Complaint.id).where(Complaint.id == complaint_id, condition))
        if visible_id is None:
            raise HTTPException(404, "Complaint not found or unavailable to this account")

    image_data = None
    image_type = None
    if image is not None:
        image_data = await image.read(MAX_IMAGE_BYTES + 1)
        if len(image_data) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "Image must be 5 MB or smaller")
        image_type = image_mime(image_data, image.content_type or "")

    provider = "local"
    draft = None
    if gemini is not None:
        try:
            generated = gemini.analyze_issue(sanitize_user_text(clean_message), image_data, image_type)
            fields = ("title", "description", "assistant_message")
            if isinstance(generated, dict) and all(
                isinstance(generated.get(field), str) and generated[field].strip() for field in fields
            ):
                draft = {field: sanitize_user_text(generated[field])[:limit] for field, limit in
                         (("title", 200), ("description", 10_000), ("assistant_message", 3_000))}
                if all(draft.values()):
                    provider = "gemini"
                else:
                    draft = None
        except Exception:
            # Optional provider errors must never expose credentials or block local drafting.
            draft = None
    if draft is None:
        draft = local_issue_draft(clean_message, image_data is not None)

    analysis_input = AnalyzeComplaint(
        title=draft["title"], description=draft["description"], latitude=latitude, longitude=longitude,
    )
    analysis = analyze(db, analysis_input.title, analysis_input.description, user,
                       latitude=latitude, longitude=longitude, exclude_id=complaint_id)
    assistant_message = draft["assistant_message"]
    if provider == "gemini":
        assistant_message += " AI suggestions may be incorrect; review and confirm this draft before submitting."
    return ChatbotAnalyzeReply(
        assistant_message=assistant_message,
        draft_complaint={"title": draft["title"], "description": draft["description"]},
        suggested_category=analysis["suggested_category"],
        suggested_department=analysis["suggested_department"],
        suggested_priority=analysis["suggested_priority"],
        possible_duplicates=analysis["possible_duplicates"],
        reasons=analysis["reasons"],
        ai_provider=provider,
        requires_user_confirmation=True,
    )
