"""Public language readiness contract; no provider-specific API payloads."""
from typing import Annotated, Literal
from pydantic import BaseModel, Field, StringConstraints, field_validator
from app.schemas.domain import Input

LanguageTag = Annotated[str, StringConstraints(
    strip_whitespace=True, min_length=2, max_length=35,
    pattern=r"^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$",
)]
CapabilityName = Literal["asr", "nmt", "tts", "ocr", "language_detection", "transliteration"]


class LanguageCapability(BaseModel):
    name: CapabilityName
    available: bool = False
    status: Literal["not_configured"] = "not_configured"


class LanguageCapabilities(BaseModel):
    provider: Literal["bhashini"] = "bhashini"
    enabled: Literal[False] = False
    pending_approval: Literal[True] = True
    capabilities: list[LanguageCapability]
    fallbacks: list[str]


class TranslationRequest(Input):
    # Do not strip the text: the unavailable adapter must preserve it exactly.
    text: str = Field(min_length=1, max_length=10000)
    source_language: LanguageTag
    target_language: LanguageTag

    @field_validator("text")
    @classmethod
    def nonblank_text(cls, value):
        if not value.strip():
            raise ValueError("Text must contain non-whitespace characters")
        return value


class TranslationFallback(BaseModel):
    provider: Literal["bhashini"] = "bhashini"
    available: Literal[False] = False
    status: Literal["unavailable"] = "unavailable"
    original_text: str
    text: str
    source_language: str
    target_language: str
    translated: Literal[False] = False
    message: str = "Translation is unavailable; original text preserved."
