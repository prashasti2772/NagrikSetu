"""Language capability discovery and explicitly unavailable translation fallback."""
from typing import Annotated
from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.language import LanguageCapabilities, TranslationFallback, TranslationRequest
from app.services.language import LanguageProvider, get_language_provider

router = APIRouter(prefix="/api/v1/language", tags=["language"])
Provider = Annotated[LanguageProvider, Depends(get_language_provider)]


@router.get("/capabilities", response_model=LanguageCapabilities)
def capabilities(provider: Provider):
    return provider.capabilities()


@router.post("/translate", response_model=TranslationFallback)
def translate(payload: TranslationRequest, provider: Provider, user=Depends(get_current_user)):
    return provider.translate(payload)
