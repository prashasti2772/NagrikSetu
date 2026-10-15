"""Brevo transactional email over HTTPS REST, with bounded, sanitized failures.

Contract: https://developers.brevo.com/docs/send-a-transactional-email
No SMTP, automatic retry, or redirect forwards an API key to another service.
"""
import json
import logging
import ssl
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, HTTPSHandler, Request, build_opener

import certifi


class EmailDeliveryUnavailable(RuntimeError):
    """Provider failure with no recipient, security code, or provider response."""


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class BrevoOTPDelivery:
    endpoint = "https://api.brevo.com/v3/smtp/email"

    def __init__(self, api_key, sender_email, sender_name="NagrikSetu",
                 purpose="password_reset", expiry_minutes=10):
        self._api_key = api_key
        self._sender_email = sender_email
        self._sender_name = sender_name
        self._purpose = purpose
        self._expiry_minutes = expiry_minutes

    def send(self, email: str, otp: str) -> None:
        action = "verify your email address" if self._purpose == "email_verification" else "reset your password"
        body = json.dumps({
            "sender": {"email": self._sender_email, "name": self._sender_name},
            "to": [{"email": email}],
            "subject": "NagrikSetu email verification" if self._purpose == "email_verification" else "NagrikSetu password reset",
            "textContent": (
                f"Use this code to {action}: {otp}\n"
                f"The code expires in {self._expiry_minutes} minutes. "
                "Do not share it. If you did not request this, ignore this message."
            ),
        }).encode("utf-8")
        request = Request(self.endpoint, data=body, method="POST", headers={
            "Accept": "application/json", "Content-Type": "application/json",
            "api-key": self._api_key,
        })
        try:
            context = ssl.create_default_context(cafile=certifi.where())
            opener = build_opener(_NoRedirect(), HTTPSHandler(context=context))
            with opener.open(request, timeout=10) as response:
                if response.status != 201:
                    logging.getLogger("nagriksetu.email").error(
                        "Brevo email delivery was not accepted (HTTP %s)", response.status)
                    raise EmailDeliveryUnavailable("Email provider did not accept delivery")
        except HTTPError as error:
            logging.getLogger("nagriksetu.email").error(
                "Brevo email delivery rejected (HTTP %s); check provider configuration and quota", error.code)
            error.close()
            raise EmailDeliveryUnavailable("Email provider did not accept delivery") from None
        except (URLError, OSError, ValueError):
            logging.getLogger("nagriksetu.email").error(
                "Brevo email delivery unavailable; check network and provider configuration")
            raise EmailDeliveryUnavailable("Email provider is unavailable") from None
