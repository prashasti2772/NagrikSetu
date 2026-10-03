"""Local NagrikSetu FAQ retrieval and permission-scoped complaint lookups."""
import json
import re
from functools import lru_cache
from fastapi import HTTPException
from sqlalchemy import select
from app.core.config import BACKEND_DIR
from app.core.workflow import scope
from app.models.complaint import Complaint
from app.models.domain import Department
from app.schemas.chatbot import ChatReply, ComplaintSnapshot
from app.services.gemini import sanitize_user_text

@lru_cache(maxsize=1)
def knowledge():
    return json.loads((BACKEND_DIR / "data/support_knowledge.json").read_text(encoding="utf-8"))

def normalized(text):
    return " ".join(re.findall(r"[a-z0-9]+", text.lower()))

def reply(db, payload, user, gemini=None):
    message = normalized(payload.message)
    match = re.search(r"(?:\b(?:complaint|issue|report)\s*(?:id\s*)?[#:]?\s*|#)([0-9]{1,10})(?![0-9])", payload.message, re.I)
    complaint_id = payload.complaint_id or (int(match.group(1)) if match else None)
    if complaint_id is not None:
        if not 0 < complaint_id <= 2147483647:
            raise HTTPException(422, "Complaint ID must be a positive 32-bit integer")
        if user is None:
            raise HTTPException(401, "Sign in to check a complaint", headers={"WWW-Authenticate": "Bearer"})
        condition = Complaint.citizen_id == user.id if user.role == "citizen" else scope(user)
        complaint = db.scalar(select(Complaint).where(Complaint.id == complaint_id, condition))
        if complaint is None:
            raise HTTPException(404, "Complaint not found or unavailable to this account")
        status = complaint.status.value
        return ChatReply(answer=f"Complaint #{complaint.id} is {status.replace('_', ' ')}. Verification: {complaint.verification_status}.",
                         topic="complaint_status", suggestions=["What do complaint statuses mean?", "How does resolution verification work?"],
                         complaint=ComplaintSnapshot.model_validate(complaint))
    if re.search(r"\bmy\b.*\b(?:status|progress)\b|\b(?:status|progress)\b.*\bmy\b", message):
        if user is None:
            raise HTTPException(401, "Sign in to check a complaint", headers={"WWW-Authenticate": "Bearer"})
        return ChatReply(answer='Please provide the complaint ID, for example "status of complaint #123". You can find it in My Complaints.',
                         topic="complaint_id_required", suggestions=["How do I track a complaint?"])
    if gemini is not None:
        generated = gemini.chat_reply(payload.message)
        if generated:
            return ChatReply(**generated)
    ranked = []
    for item in knowledge():
        matches = [phrase for phrase in item["phrases"] if re.search(r"\b" + re.escape(phrase) + r"\b", message)]
        ranked.append((max((len(p.split()) for p in matches), default=0), item))
    score, item = max(ranked, key=lambda pair: pair[0])
    if not score:
        return ChatReply(answer="I can help with NagrikSetu reporting, tracking, categories, statuses, assignment and resolution verification. Please choose a topic or provide a complaint ID after signing in.",
                         topic="help", suggestions=["How do I report an issue?", "How do I track a complaint?", "What do complaint statuses mean?"])
    answer = item["answer"]
    if item["topic"] == "categories":
        departments = db.scalars(select(Department.name).where(Department.is_active.is_(True)).order_by(Department.id)).all()
        if departments:
            answer += " Active departments: " + "; ".join(departments) + "."
    return ChatReply(answer=answer, topic=item["topic"], suggestions=item["suggestions"])


def local_issue_draft(message, has_image):
    safe_message = sanitize_user_text(message)
    if safe_message:
        title = safe_message[:200].split("\n", 1)[0].strip()[:200] or "Civic issue report"
        description = safe_message[:10_000]
        if has_image:
            description += " Citizen also attached an image for authority review."
        answer = "Review this draft and its suggestions, then confirm before submitting the complaint."
    else:
        title = "Civic issue in uploaded image"
        description = ("An image was attached, but image understanding is unavailable. "
                       "Please describe the civic issue and its location before submitting.")
        answer = "I could not inspect the image locally. Add a short description, review the draft, and confirm before submitting."
    return {"title": title, "description": description, "assistant_message": answer}
