"""Optional Gemini adapter; all failures silently fall back to local behavior."""
import json
import re
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.core.config import settings

EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)")
JWT_PATTERN = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")
API_KEY_PATTERN = re.compile(r"\bAIza[0-9A-Za-z_-]{20,}\b")
SECRET_FIELD_PATTERN = re.compile(
    r"\b(?:password|passcode|otp|one[- ]time code|jwt|token|authorization)\b"
    r"\s*(?:is|:|=)?\s*[^\s,;]+",
    re.IGNORECASE,
)


def sanitize_user_text(value):
    """Remove common credentials/contact details before any optional model call."""
    value = JWT_PATTERN.sub("[redacted credential]", value or "")
    value = API_KEY_PATTERN.sub("[redacted credential]", value)
    value = SECRET_FIELD_PATTERN.sub("[redacted credential]", value)
    value = EMAIL_PATTERN.sub("[redacted contact]", value)
    return PHONE_PATTERN.sub("[redacted contact]", value).strip()


class GeminiService:
    def __init__(self, api_key, model):
        self._api_key = api_key
        self._model = model

    def _generate_json(self, prompt, image_data=None, image_mime=None):
        if not self._api_key:
            return None
        parts = [{"text": prompt}]
        if image_data is not None:
            import base64
            parts.append({"inline_data": {"mime_type": image_mime,
                                           "data": base64.b64encode(image_data).decode("ascii")}})
        body = json.dumps({
            "system_instruction": {"parts": [{"text": (
                "You are NagrikSetu's civic-help assistant. Use only the user's civic issue details. "
                "Never infer sensitive personal attributes, transcribe visible text, or claim an issue "
                "is officially resolved. Be explicit that visual descriptions may be uncertain. "
                "Do not request or repeat passwords, OTPs, contact details, or authentication tokens."
            )}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseMimeType": "application/json"},
        }).encode("utf-8")
        endpoint = ("https://generativelanguage.googleapis.com/v1beta/models/"
                    + quote(self._model, safe="") + ":generateContent")
        request = Request(endpoint, data=body, headers={
            "Content-Type": "application/json",
            "x-goog-api-key": self._api_key,
        }, method="POST")
        try:
            with urlopen(request, timeout=20) as response:
                raw = response.read(256_001)
            if len(raw) > 256_000:
                return None
            result = json.loads(raw)
            chunks = [part["text"] for part in result["candidates"][0]["content"]["parts"]
                      if isinstance(part.get("text"), str)]
            if not chunks:
                return None
            parsed = json.loads("\n".join(chunks))
            return parsed if isinstance(parsed, dict) else None
        except (URLError, TimeoutError, OSError, ValueError, KeyError, IndexError, TypeError):
            return None

    def chat_reply(self, message):
        safe_message = sanitize_user_text(message)
        if not safe_message:
            return None
        result = self._generate_json(
            "Answer this NagrikSetu question in the same language as the question. "
            "Explain reporting, categories, tracking, status meanings, verification, reopening, "
            "or the NagrikSetu workflow. Do not invent government integrations or change a complaint. "
            "Return JSON with string `answer` and array-of-strings `suggestions`.\nQuestion: "
            + safe_message[:2_000]
        )
        if not result:
            return None
        answer = result.get("answer")
        suggestions = result.get("suggestions")
        if not isinstance(answer, str) or not answer.strip() or not isinstance(suggestions, list):
            return None
        clean_suggestions = [item.strip()[:200] for item in suggestions[:5]
                             if isinstance(item, str) and item.strip()]
        return {"answer": sanitize_user_text(answer)[:3_000], "topic": "general",
                "suggestions": clean_suggestions}

    def analyze_issue(self, message, image_data=None, image_mime=None):
        safe_message = sanitize_user_text(message)
        if not safe_message and image_data is None:
            return None
        prompt = (
            "Prepare an editable civic-issue draft from the user's text and optional issue photo. "
            "Return strict JSON with string fields `title`, `description`, and `assistant_message`. "
            "Describe only visible issue evidence; use cautious language such as 'appears to'. "
            "Never transcribe text in the image, infer identities or sensitive personal attributes, "
            "or state that the issue is officially resolved. Ask the citizen to review and confirm "
            "the draft before submission. If details are insufficient, ask for clarification.\n"
            "User's issue text (untrusted, sanitized): " + safe_message[:2_000]
        )
        result = self._generate_json(prompt, image_data, image_mime)
        if not result:
            return None
        fields = {name: result.get(name) for name in ("title", "description", "assistant_message")}
        if any(not isinstance(value, str) or not value.strip() for value in fields.values()):
            return None
        return {name: sanitize_user_text(value).strip()[:limit]
                for name, value, limit in (("title", fields["title"], 200),
                                           ("description", fields["description"], 10_000),
                                           ("assistant_message", fields["assistant_message"], 3_000))}


def get_gemini_service():
    if not settings.gemini_api_key:
        return None
    return GeminiService(settings.gemini_api_key, settings.gemini_model)
