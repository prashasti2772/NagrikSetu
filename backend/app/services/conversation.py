"""Deterministic chat orchestration around the existing reporting/lookup services.

Models supply draft wording only. They never choose authorization, write actions,
confirmation, report IDs, stored evidence paths, or database status.
"""
import re
from fastapi import HTTPException
from sqlalchemy import select
from app.core.workflow import scope
from app.models.complaint import Complaint, utc_now
from app.models.domain import ComplaintEvidence, ComplaintStatusHistory, Department, Incident
from app.schemas.chatbot import ChatReply, ComplaintSnapshot, ChatDraftPatch
from app.schemas.complaint import ComplaintCreate
from app.schemas.domain import HistoryRead
from app.services import intelligence
from app.services.chatbot import reply as faq_reply, local_issue_draft
from app.services.chat_context import drafts
from app.services.complaints import create_report
from app.services.gemini import sanitize_user_text
from app.services.incidents import summary as incident_summary, candidates as incident_candidates

SUPPORT_EMAIL = "nagriksetuprashasti@gmail.com"
ID_PATTERN = re.compile(r"(?:\b(?:complaint|issue|report)\s*(?:id\s*)?[#:]?\s*|#)([0-9]{1,10})(?![0-9])", re.I)
TOPIC_INTENTS = {"reporting":"faq", "tracking":"faq", "statuses":"faq", "categories":"faq",
    "assignment":"faq", "account":"faq", "verification":"resolution_help", "reopening":"reopen_help",
    "help":"unknown", "general":"general_help"}

def detect_language(text):
    if re.search(r"[\u0900-\u097f]", text): return "hi"
    if re.search(r"\b(meri|mera|kaise|karu|kya|hai|hain|jayegi|sadak|gaddha|paani|kuda)\b", text, re.I):
        return "hi-Latn"
    if re.search(r"[A-Za-z]", text): return "en"
    return "und"

def language_metadata(text, requested=None, response="en"):
    detected = detect_language(text)
    return {"requested_language":requested, "language":requested or detected,
            "detected_language":detected, "response_language":response, "translation_used":False}

def localized(key, english, text, requested):
    lang = requested or detect_language(text)
    roman = {
        "draft":"Draft ko check karein. Report bhejne ke liye confirmation card par Confirm chunein.",
        "missing":"Issue ki chhoti description dein. Location aur image optional hain.",
        "created":"Aapki alag complaint submit ho gayi hai. My Complaints mein status dekhein.",
        "selection":"Apni complaint chunein; bina chune kisi report ka status assume nahi kiya jayega.",
        "cancel":"Draft cancel ho gaya. Koi complaint submit nahi hui.",
        "help":"Main civic issue report, status, location aur resolution mein madad kar sakta hoon.",
        "location":"Location optional hai. Pin share karein ya address manually likhein; permission deny hone par bhi report kar sakte hain.",
        "evidence":"Image optional supporting evidence hai. Report banne ke baad secure upload karein; upload fail ho to report phir bhi saved rahegi.",
        "identity":"Identity verification optional hai. DigiLocker/Aadhaar live nahi hain. Koi Aadhaar number ya KYC document na bhejein.",
        "resolution":"Incident ka deadline aur quorum dekhein. Repair check karke approve ya reject karein; khamoshi approval nahi hai.",
        "reopen":"Issue unresolved ho to verification mein reject karein, ya apni report par reason ke saath reopen request karein.",
        "status":"Aapki chuni hui complaint ka current status neeche diya hai.",
    }
    hindi = {
        "draft":"??????? ??????? ??????? ????? ?? ??? ?????? ????? ?? Confirm ??????",
        "missing":"?????? ?? ???? ????? ???? ????? ?? ?????? ???????? ????",
        "created":"???? ??? ?????? ???? ?? ?? ??? My Complaints ??? ?????? ??????",
        "selection":"???? ?????? ?????? ???? ??? ???? ??????? ?? ?????? ?? ?????? ???? ????? ??????",
        "cancel":"??????? ???? ???? ??? ?????? ???? ???? ????",
        "help":"??? ?????? ?????? ?? ???????, ??????, ????? ?? ?????? ??? ??? ?? ???? ????",
        "location":"????? ???????? ??? ??? ???? ???? ?? ??? ?????? ?????? ? ????? ?? ?? ??????? ?? ???? ????",
        "evidence":"?????? ???????? ????? ?????? ??? ??????? ???? ?? ??? ???????? ????? ????? ????? ???? ???? ?? ?? ??????? ???????? ??????",
        "identity":"????? ??????? ???????? ??? DigiLocker/Aadhaar ???? ?????? ???? ??? ???? ???? ?? KYC ???????? ? ??????",
        "resolution":"???? ?? ??? ???? ?? ?????? ??????? ?????? ?????? ?????? ??????? ?? ???????? ????? ?????? ?? ???????? ???? ???? ?????",
        "reopen":"?????? ??? ?? ?? ?????? ???????? ???? ?? ???? ??????? ?? ???? ???? ??? ????? ?? ?????? ?????",
        "status":"???? ???? ?? ?????? ?? ??????? ?????? ???? ?? ?? ???",
    }
    if lang.lower() in {"hi-latn", "hinglish"}: return roman.get(key, english), "hi-Latn"
    if lang.lower().split("-")[0] == "hi": return hindi.get(key, english), "hi"
    return english, "en"

def response(intent, message, *, text="", requested=None, topic=None, key="help", **fields):
    message, response_language = localized(key, message, text, requested)
    return ChatReply(answer=message, message=message, topic=topic or intent, intent=intent,
        suggestions=["Report an issue", "Track my complaint", "Help & Support"],
        **language_metadata(text, requested, response_language), **fields)

def detect_intent(message):
    text = message.casefold()
    if re.search(r"\b(aadhaar|digilocker|identity|verified citizen)\b|\u0906\u0927\u093e\u0930|\u092a\u0939\u091a\u093e\u0928", text): return "identity_help"
    if re.search(r"\b(reopen|still broken|not fixed)\b|\u0926\u094b\u092c\u093e\u0930\u093e|\u0920\u0940\u0915 \u0928\u0939\u0940\u0902", text): return "reopen_help"
    if re.search(r"\b(resolution|verification|verify repair)\b|\u0938\u0924\u094d\u092f\u093e\u092a\u0928", text): return "resolution_help"
    if re.search(r"\b(image|photo|evidence|attachment)\b|\u0924\u0938\u094d\u0935\u0940\u0930|\u092b\u094b\u091f\u094b", text): return "evidence_help"
    if re.search(r"\b(location|gps|map|pin|address)\b|\u0938\u094d\u0925\u093e\u0928|\u092a\u0924\u093e", text) and not re.search(r"pothole|garbage|broken|sewage", text):
        return "location_help"
    if re.search(r"how.*(?:report|track)|kaise|\u0915\u0948\u0938\u0947|statuses mean|status mean|categories|forgot password|complaints assigned", text):
        return "faq"
    if re.search(r"\bincident\b", text) and re.search(r"status|progress|\u0938\u094d\u0925\u093f\u0924\u093f", text): return "incident_status"
    if re.search(r"\b(status|my complaints|meri complaint|my reports|track my)\b|\u092e\u0947\u0930\u0940 \u0936\u093f\u0915\u093e\u092f\u0924|\u0938\u094d\u0925\u093f\u0924\u093f", text): return "complaint_status"
    if re.search(r"\b(department|priority|duplicate|same problem|already report|same incident)\b|\u0935\u093f\u092d\u093e\u0917", text): return "complaint_analysis"
    if re.search(r"\b(submit|create|file|send)\b.*\b(complaint|report)\b|\u0936\u093f\u0915\u093e\u092f\u0924 \u092d\u0947\u091c", text): return "complaint_create"
    if re.search(r"\b(pothole|garbage|road|sewage|streetlight|drain|waterlogging|gaddha|sadak|kuda|paani|broken)\b|\u0917\u0921\u094d\u0922\u093e|\u0938\u0921\u093c\u0915|\u0915\u0942\u0921\u093c\u093e|\u092a\u093e\u0928\u0940", text):
        return "complaint_draft"
    if re.search(r"^\s*(help|hello|hi|namaste|support)\b|\u092e\u0926\u0926|\u0928\u092e\u0938\u094d\u0924\u0947", text): return "general_help"
    return "unknown"


def lookup_id(payload):
    match = ID_PATTERN.search(payload.message)
    found = payload.complaint_id or (int(match.group(1)) if match else None)
    if found is not None and not 0 < found <= 2147483647:
        raise HTTPException(422, "Complaint ID must be a positive 32-bit integer")
    return found

def permitted_report(db, complaint_id, user):
    if user is None:
        raise HTTPException(401, "Sign in to check a complaint", headers={"WWW-Authenticate":"Bearer"})
    condition = Complaint.citizen_id == user.id if user.role == "citizen" else scope(user)
    row = db.scalar(select(Complaint).where(Complaint.id == complaint_id, condition))
    if row is None:
        raise HTTPException(404, "Complaint not found or unavailable to this account")
    return row

def safe_evidence(db, evidence_id, user):
    if evidence_id is None: return None
    if user is None: raise HTTPException(401, "Sign in to reference evidence")
    row = db.scalar(select(ComplaintEvidence).join(Complaint, Complaint.id == ComplaintEvidence.complaint_id)
        .where(ComplaintEvidence.id == evidence_id, Complaint.citizen_id == user.id,
               ComplaintEvidence.uploaded_by == user.id, ComplaintEvidence.evidence_type.in_(["report","supporting"])))
    if row is None:
        raise HTTPException(404, "Evidence not found or unavailable")
    return row

def tracking(db, payload, user, intent, complaint_id):
    if user is None:
        raise HTTPException(401, "Sign in to check a complaint", headers={"WWW-Authenticate":"Bearer"})
    if complaint_id is None:
        condition = Complaint.citizen_id == user.id if user.role == "citizen" else scope(user)
        rows = db.scalars(select(Complaint).where(condition).order_by(Complaint.id.desc())
            .offset(payload.selection_offset).limit(11)).all()
        return response(intent, "Select a complaint from your permitted reports. You can also provide its complaint ID.",
            text=payload.message, requested=payload.requested_language, topic="complaint_id_required", key="selection",
            selections=[ComplaintSnapshot.model_validate(row).model_dump(mode="json") for row in rows[:10]],
            selection_has_more=len(rows)>10, suggested_actions=["select_complaint","next_page"] if len(rows)>10 else ["select_complaint"],
            error_code="complaint_selection_required")
    row = permitted_report(db, complaint_id, user)
    department = db.get(Department, row.assigned_department_id) if row.assigned_department_id else None
    incident = db.get(Incident, row.incident_id) if row.incident_id else None
    history = db.scalars(select(ComplaintStatusHistory).where(ComplaintStatusHistory.complaint_id == row.id)
        .order_by(ComplaintStatusHistory.id.desc()).limit(10)).all()
    return response(intent, f"Complaint #{row.id} is {row.status.value.replace('_',' ')}. Verification: {row.verification_status}.",
        text=payload.message, requested=payload.requested_language, key="status", topic="complaint_status",
        complaint=ComplaintSnapshot.model_validate(row), complaint_id=row.id, incident_id=row.incident_id,
        status_summary={"status":row.status, "verification_status":row.verification_status,
            "department": {"id":department.id,"name":department.name} if department else None,
            "resolution_notes":row.resolution_notes, "incident":incident_summary(db,incident) if incident else None},
        timeline_summary=[HistoryRead.model_validate(event).model_dump(mode="json") for event in reversed(history)],
        suggested_actions=["view_complaint","view_timeline","view_evidence"])

def validate_location(values):
    if (values.get("latitude") is None) != (values.get("longitude") is None):
        raise HTTPException(422, "latitude and longitude must be provided together")

def draft_analysis(db, values, user):
    return intelligence.analyze(db, values.get("title") or "Civic issue", values.get("description") or "",
        user, category=values.get("category"), latitude=values.get("latitude"),
        longitude=values.get("longitude"), address=values.get("location_text"))

def draft_result(db, key, row, user, text, requested=None, *, intent="complaint_draft", provider="local"):
    analysis = draft_analysis(db, row.values, user)
    missing = [name for name in ("title","description","category") if not row.values.get(name)]
    if row.needs_description and "description" not in missing: missing.append("description")
    # Same existing incident matcher, but never expose another report's ID or text.
    hints = []
    if user is not None and not missing:
        source = Complaint(id=-1, incident_id=-1, created_at=utc_now(), title=row.values["title"],
            description=row.values["description"], category=row.values["category"],
            latitude=row.values.get("latitude"), longitude=row.values.get("longitude"),
            location_accuracy_m=row.values.get("location_accuracy_m"))
        hints = [{name:item[name] for name in ("incident_id","similarity","text_similarity",
                 "approximate_distance_m","reason","linked","category_match")}
                 for item in incident_candidates(db,source,user,include_all_reports=True)]
    message = ("Describe the civic issue before confirming. Location and images are optional." if missing else
        "Review this structured draft, then explicitly confirm to submit your individual report.")
    if hints: message += " Similar reports may concern the same civic incident; you can still submit your own report."
    return response(intent, message, text=text, requested=requested, key="missing" if missing else "draft",
        complaint_draft={**row.values,"image_attached":row.image_attached}, draft_id=key,
        draft_version=row.version, draft_expires_in=max(0,int(row.expires-drafts.clock())),
        missing_fields=missing, requires_confirmation=True,
        suggested_category=analysis["suggested_category"], suggested_department=analysis["suggested_department"],
        suggested_priority=analysis["suggested_priority"], confidence=analysis["confidence"], reasons=analysis["reasons"],
        possible_duplicates=analysis["possible_duplicates"], same_incident_candidates=hints,
        suggested_actions=["edit_draft","confirm","cancel"] if not missing else ["edit_draft","cancel"],
        provider_used=provider, fallback_used=provider=="local",
        error_code="missing_information" if missing else None)

def prepare_draft(db, values, user, text, requested=None, *, image_attached=False,
                  needs_description=False, provider="local", intent="complaint_draft"):
    if user is not None and user.role != "citizen":
        raise HTTPException(403, "Citizen access required for report drafts")
    # Schema whitelist prevents ownership, role, assignment or workflow injection.
    values = ChatDraftPatch.model_validate(values).model_dump(exclude_unset=True)
    values = {key:sanitize_user_text(value) if isinstance(value,str) else value for key,value in values.items()}
    validate_location(values)
    safe_evidence(db,values.get("evidence_id"),user)
    analysis = draft_analysis(db,values,user)
    values.setdefault("category",analysis["suggested_category"])
    values.setdefault("severity",analysis["suggested_priority"])
    key,row = drafts.add(user,values,image_attached=image_attached,needs_description=needs_description)
    return draft_result(db,key,row,user,text,requested,intent=intent,provider=provider)

def draft_action(db,payload,user):
    if not payload.draft_id:
        raise HTTPException(409, "Prepare and review a draft before confirming, updating or cancelling")
    if user is not None and user.role != "citizen":
        raise HTTPException(403, "Citizen access required")
    with drafts.lock:
        row = drafts.get(payload.draft_id,user)
        if payload.action == "cancel":
            if row.created_id is not None:
                raise HTTPException(409, "Complaint already created; cancelling cannot delete a report")
            del drafts.rows[payload.draft_id]
            return response("complaint_draft","Draft cancelled; no complaint created.",
                text=payload.message,requested=payload.requested_language,key="cancel")
        if payload.draft_version != row.version:
            raise HTTPException(409, "Draft version changed; review the latest draft before continuing")
        if payload.action == "confirm":
            if user is None: raise HTTPException(401, "Sign in and review an authenticated draft before submitting")
            if not payload.confirm:
                return draft_result(db,payload.draft_id,row,user,payload.message,payload.requested_language,
                                    intent="complaint_create")
            if payload.draft is not None:
                raise HTTPException(409, "Update and review the draft separately before confirming")
            if row.created_id is None:
                missing = any(not row.values.get(key) for key in ("title","description","category"))
                if missing or row.needs_description:
                    return draft_result(db,payload.draft_id,row,user,payload.message,payload.requested_language,
                                        intent="complaint_create")
                evidence = safe_evidence(db,row.values.get("evidence_id"),user)
                values={key:value for key,value in row.values.items() if key!="evidence_id"}
                result=create_report(db,ComplaintCreate.model_validate(values),user,evidence=evidence)
                row.created_id=result.id
                # Keep only the idempotency receipt, not the completed complaint text.
                row.values.clear()
                candidates=[item.model_dump() for item in result.same_incident_candidates]
            else:
                candidates=[]
            report=permitted_report(db,row.created_id,user)
            return response("complaint_create",f"Complaint #{report.id} submitted. Track it in My Complaints.",
                text=payload.message,requested=payload.requested_language,key="created",
                complaint=ComplaintSnapshot.model_validate(report),complaint_id=report.id,incident_id=report.incident_id,
                status_summary={"status":report.status,"verification_status":report.verification_status},
                same_incident_candidates=candidates,
                suggested_actions=["view_complaint","upload_evidence","view_timeline"])
        if row.created_id is not None:
            raise HTTPException(409,"This draft was already submitted; start another draft")
        if payload.confirm:
            raise HTTPException(409,"Use the explicit confirm action after reviewing the draft")
        updates = payload.draft.model_dump(exclude_unset=True) if payload.draft else {}
        if not updates and payload.action=="update_draft":
            updates={"description":sanitize_user_text(payload.message)}
        updates={key:sanitize_user_text(value) if isinstance(value,str) else value for key,value in updates.items()}
        combined={**row.values,**updates}
        validate_location(combined)
        safe_evidence(db,combined.get("evidence_id"),user)
        if updates:
            row.values=combined
            row.version+=1
            if updates.get("description"): row.needs_description=False
        return draft_result(db,payload.draft_id,row,user,payload.message,payload.requested_language)

def converse(db,payload,user,gemini=None):
    if payload.action!="message" or payload.draft_id:
        return draft_action(db,payload,user)
    if payload.confirm:
        raise HTTPException(409,"Prepare a draft and use the explicit confirm action")
    complaint_id=lookup_id(payload)
    intent=payload.intent or detect_intent(payload.message)
    if complaint_id is not None or intent in {"complaint_status","incident_status"}:
        return tracking(db,payload,user,"incident_status" if intent=="incident_status" else "complaint_status",complaint_id)
    if payload.draft is not None or intent in {"complaint_draft","complaint_analysis","complaint_create"}:
        values=payload.draft.model_dump(exclude_unset=True) if payload.draft else {}
        # A generic "submit"/"which department" request lacks an issue description.
        has_issue=detect_intent(payload.message)=="complaint_draft"
        if has_issue and not values.get("description"):
            local=local_issue_draft(payload.message,False)
            values.setdefault("title",local["title"]); values["description"]=local["description"]
        return prepare_draft(db,values,user,payload.message,payload.requested_language,intent=intent)
    help_text = {
        "location_help":("location","Location is optional. Share a pin or enter a manual address; permission denial never blocks reporting."),
        "evidence_help":("evidence","Images are optional supporting evidence. Use image analysis for an editable draft, then upload through the secure evidence endpoint after creating the report."),
        "identity_help":("identity","Identity verification is optional. DigiLocker and offline Aadhaar verification are unavailable; do not send Aadhaar numbers or KYC documents."),
        "resolution_help":("resolution","Check the incident's verification deadline and quorum. Approve or reject the repair through your report; silence is not approval."),
        "reopen_help":("reopen","Reject unresolved work during verification, or use your report's reasoned reopen request after a prior response or expiry."),
    }
    if intent in help_text and detect_language(payload.message)!="en":
        key,text=help_text[intent]
        return response(intent,text,text=payload.message,requested=payload.requested_language,key=key,
                        suggested_actions=["view_complaint"] if "help" in intent else [])
    if intent in {"location_help","evidence_help","identity_help"}:
        key,text=help_text[intent]
        return response(intent,text,text=payload.message,requested=payload.requested_language,key=key)
    if detect_language(payload.message)!="en" and intent in {"faq","general_help","unknown"}:
        return response(intent,"I can help with reporting, tracking, location and resolution. Describe the issue, or select a quick action.",
            text=payload.message,requested=payload.requested_language,key="help",suggested_actions=["report_issue","track_complaint"],
            error_code="unsupported_language_fallback" if (payload.requested_language or detect_language(payload.message)).split("-")[0] not in {"en","hi"} else None)
    # Existing trusted FAQ and legacy answer/topic/suggestions remain compatible.
    legacy=faq_reply(db,payload,user,gemini)
    result_intent=intent if intent == "general_help" else TOPIC_INTENTS.get(legacy.topic,intent)
    if payload.intent: result_intent=payload.intent
    answer=legacy.answer
    if "support" in payload.message.casefold() or "contact" in payload.message.casefold():
        answer+=" Email Help & Support: "+SUPPORT_EMAIL+". This mailbox is separate from OTP delivery."
    legacy.message=legacy.answer=answer
    legacy.intent=result_intent
    legacy.provider_used="gemini" if legacy.topic=="general" else "local"
    legacy.fallback_used=legacy.provider_used=="local"
    meta=language_metadata(payload.message,payload.requested_language,detect_language(answer) if legacy.provider_used=="gemini" else "en")
    for name,value in meta.items(): setattr(legacy,name,value)
    legacy.suggested_actions=["report_issue","track_complaint","email_support"]
    return legacy
