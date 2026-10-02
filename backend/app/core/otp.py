"""Replace the delivery dependency with a Brevo adapter when email is configured."""
import logging
from typing import Protocol
from app.core.config import settings

class OTPDelivery(Protocol):
    def send(self, email: str, otp: str) -> None: ...

class ConsoleOTPDelivery:
    def send(self, email: str, otp: str) -> None:
        logging.getLogger("nagriksetu.otp").warning("Development password OTP for %s: %s", email, otp)

def get_otp_delivery() -> OTPDelivery:
    if settings.app_env != "development":
        from fastapi import HTTPException
        raise HTTPException(503, "Password recovery email delivery is not configured")
    return ConsoleOTPDelivery()
