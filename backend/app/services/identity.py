"""Optional trust metadata; government verification providers remain unavailable.

Future approved providers must validate evidence in a dedicated trusted boundary,
discard raw material, and return only verification outcome metadata. There is no
document/identifier upload or government network implementation in this module.
"""
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from fastapi import HTTPException

from app.core.config import settings
from app.models.complaint import utc_now


@dataclass(frozen=True)
class IdentityOutcome:
    provider: str
    status: str
    verified_at: datetime | None = None


class IdentityProvider(Protocol):
    provider: str
    available: bool

    def verify(self) -> IdentityOutcome: ...


class IdentityProviderUnavailable(RuntimeError):
    pass


class DigiLockerProvider:
    """Requester approval and documented provider integration are pending."""
    provider = "digilocker"
    available = False
    status = "pending_external_approval"

    def verify(self) -> IdentityOutcome:
        raise IdentityProviderUnavailable("DigiLocker requester integration is not available")


class AadhaarOfflineProvider:
    """Boundary for future trusted signature/QR validation; accepts no documents yet."""
    provider = "aadhaar_offline"
    available = False
    status = "trusted_offline_validation_not_implemented"

    def verify(self) -> IdentityOutcome:
        raise IdentityProviderUnavailable("Trusted offline identity verification is not available")


def demo_identity_enabled():
    return (os.getenv("APP_ENV", settings.app_env).strip().lower() == "development"
            and os.getenv("ENABLE_DEMO_IDENTITY", "false").strip().lower() in {"1", "true"})


def verification_state(user):
    stored_status = user.identity_status
    status = "email_verified" if user.email_verified else "unverified"
    if stored_status in {"identity_verified", "demo_verified"}:
        status = stored_status
    has_identity_outcome = status in {"identity_verified", "demo_verified"}
    labels = {"unverified": "Unverified Citizen", "email_verified": "Email Verified Citizen",
              "identity_verified": "Identity Verified Citizen", "demo_verified": "Demo Verified Citizen"}
    providers = [{"provider": provider.provider, "available": provider.available, "status": provider.status}
                 for provider in (DigiLockerProvider(), AadhaarOfflineProvider())]
    providers.append({"provider": "demo", "available": demo_identity_enabled(),
                      "status": "demo_only" if demo_identity_enabled() else "disabled"})
    return {"status": status, "email_verified": user.email_verified,
            "identity_verified": status == "identity_verified", "is_demo": status == "demo_verified",
            "provider": user.identity_provider if has_identity_outcome else None,
            "verified_at": user.identity_verified_at if has_identity_outcome else None,
            "display_label": labels[status], "providers": providers}


def mark_demo_verified(user):
    if not demo_identity_enabled():
        raise HTTPException(503, "Demo identity verification is disabled")
    if user.identity_status == "identity_verified":
        raise HTTPException(409, "An existing identity verification cannot be replaced by a demo")
    if user.identity_status != "demo_verified":
        user.identity_status = "demo_verified"
        user.identity_provider = "demo"
        user.identity_verified_at = utc_now()
