"""Injectable OTP delivery without logging security codes or contact details."""
import logging
from typing import Protocol

from fastapi import HTTPException

from app.core.config import integration_setting, settings
from app.services.email import BrevoOTPDelivery


class OTPDelivery(Protocol):
    def send(self, email: str, otp: str) -> None: ...


class DevelopmentOTPDelivery:
    """No-op for local development; tests inject a capturing fake explicitly."""

    def send(self, email: str, otp: str) -> None:
        return None


def _delivery(purpose: str) -> OTPDelivery:
    api_key = integration_setting("BREVO_API_KEY").strip()
    sender = integration_setting("BREVO_SENDER_EMAIL").strip()
    name = integration_setting("BREVO_SENDER_NAME", "NagrikSetu").strip()
    if api_key and sender:
        return BrevoOTPDelivery(api_key, sender, name or "NagrikSetu", purpose,
                                settings.otp_expire_minutes)
    if api_key or sender or settings.app_env != "development":
        logging.getLogger("nagriksetu.email").error(
            "Email delivery unavailable: configure BREVO_API_KEY and BREVO_SENDER_EMAIL")
        raise HTTPException(503, "Security email delivery is unavailable; please try again later")
    return DevelopmentOTPDelivery()


def get_otp_delivery() -> OTPDelivery:
    return _delivery("password_reset")


def get_email_verification_delivery() -> OTPDelivery:
    return _delivery("email_verification")


def get_registration_email_delivery() -> OTPDelivery | None:
    """Registration remains available if optional email verification is absent."""
    api_key = integration_setting("BREVO_API_KEY").strip()
    sender = integration_setting("BREVO_SENDER_EMAIL").strip()
    if not api_key or not sender:
        return None
    name = integration_setting("BREVO_SENDER_NAME", "NagrikSetu").strip() or "NagrikSetu"
    return BrevoOTPDelivery(api_key, sender, name, "email_verification", settings.otp_expire_minutes)
