"""Disabled language-provider boundary while BHASHINI approval is pending.

This is an application interface, not a claim about the external BHASHINI API.
No endpoint, service ID, authentication header or wire payload is assumed here.
After approval, a reviewed adapter can implement this boundary and expose only
capabilities actually configured and tested. Placeholder credentials do not enable it.
"""
from typing import Protocol
from app.schemas.language import (
    LanguageCapabilities, LanguageCapability, TranslationFallback, TranslationRequest,
)

CAPABILITIES = ("asr", "nmt", "tts", "ocr", "language_detection", "transliteration",
                "audio_language_detection", "text_language_detection", "punctuation", "voice_preprocessing")


class LanguageProvider(Protocol):
    """Application-level capabilities and text fallback for a future provider.

    Speech/OCR/transliteration transports must be designed against the approved
    provider specification later; they deliberately have no invented wire contract.
    """
    def capabilities(self) -> LanguageCapabilities: ...

    def translate(self, request: TranslationRequest) -> TranslationFallback: ...


class DisabledLanguageProvider:
    def capabilities(self):
        return LanguageCapabilities(
            capabilities=[LanguageCapability(name=name) for name in CAPABILITIES],
            fallbacks=["text_input", "browser_speech_if_available"],
        )

    def translate(self, request):
        return TranslationFallback(
            original_text=request.text,
            text=request.text,
            source_language=request.source_language,
            target_language=request.target_language,
        )


def get_language_provider() -> LanguageProvider:
    # No environment variable or credential can turn on an unimplemented provider.
    return DisabledLanguageProvider()
