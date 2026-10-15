import io
import json
import os
import ssl
import unittest
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

import test_backend as legacy
from app.core.otp import (DevelopmentOTPDelivery, get_email_verification_delivery,
                          get_otp_delivery, get_registration_email_delivery)
from app.db.database import SessionLocal
from app.models.complaint import utc_now
from app.models.domain import PasswordOTP, User
from app.services.email import BrevoOTPDelivery, EmailDeliveryUnavailable, _NoRedirect
from sqlalchemy import select


class EmailProviderTests(unittest.TestCase):
    def test_brevo_rest_payload_timeout_verified_tls_and_no_redirect(self):
        for purpose, subject in [("password_reset", "password reset"), ("email_verification", "email verification")]:
            response = MagicMock()
            response.__enter__.return_value.status = 201
            with patch("app.services.email.build_opener") as factory:
                factory.return_value.open.return_value = response
                provider = BrevoOTPDelivery("test-provider-key", "sender@example.com", "Civic Support", purpose, 10)
                provider.send("recipient@example.com", "123456")
                request = factory.return_value.open.call_args.args[0]
                self.assertEqual(request.full_url, "https://api.brevo.com/v3/smtp/email")
                self.assertEqual(request.method, "POST")
                self.assertEqual(request.get_header("Api-key"), "test-provider-key")
                self.assertEqual(factory.return_value.open.call_args.kwargs, {"timeout": 10})
                body = json.loads(request.data)
                self.assertEqual(body["to"], [{"email": "recipient@example.com"}])
                self.assertEqual(body["sender"], {"email": "sender@example.com", "name": "Civic Support"})
                self.assertIn(subject, body["subject"])
                self.assertIn("123456", body["textContent"])
                handler = factory.call_args.args[1]
                self.assertEqual(handler._context.verify_mode, ssl.CERT_REQUIRED)
                self.assertTrue(handler._context.check_hostname)
                self.assertIsInstance(factory.call_args.args[0], _NoRedirect)
        self.assertIsNone(_NoRedirect().redirect_request(None, None, 302, "Found", {}, "https://other.example"))

    def test_provider_failures_are_sanitized_and_never_retried(self):
        sensitive = "test-provider-key recipient@example.com 123456"
        for failure in [HTTPError(BrevoOTPDelivery.endpoint, 401, sensitive, {}, io.BytesIO(sensitive.encode())),
                        URLError(sensitive), TimeoutError(sensitive), ValueError(sensitive)]:
            with self.subTest(failure=type(failure).__name__), patch("app.services.email.build_opener") as factory:
                factory.return_value.open.side_effect = failure
                with self.assertLogs("nagriksetu.email", level="ERROR") as logs:
                    with self.assertRaises(EmailDeliveryUnavailable) as raised:
                        BrevoOTPDelivery("test-provider-key", "sender@example.com").send("recipient@example.com", "123456")
                output = str(raised.exception) + " ".join(logs.output)
                for private in ["test-provider-key", "recipient@example.com", "123456"]:
                    self.assertNotIn(private, output)
                self.assertEqual(factory.return_value.open.call_count, 1)
        response = MagicMock()
        response.__enter__.return_value.status = 202
        with patch("app.services.email.build_opener") as factory, self.assertLogs("nagriksetu.email", level="ERROR"):
            factory.return_value.open.return_value = response
            with self.assertRaises(EmailDeliveryUnavailable):
                BrevoOTPDelivery("test-provider-key", "sender@example.com").send("recipient@example.com", "123456")

    def test_provider_selection_and_development_codes_are_not_logged(self):
        from fastapi import HTTPException
        environment = {"BREVO_API_KEY": "", "BREVO_SENDER_EMAIL": "", "BREVO_SENDER_NAME": ""}
        configuration = SimpleNamespace(app_env="development", otp_expire_minutes=10)
        with patch.dict(os.environ, environment), patch("app.core.otp.settings", configuration):
            with patch("logging.Logger._log") as logger:
                delivery = get_otp_delivery()
                self.assertIsInstance(delivery, DevelopmentOTPDelivery)
                delivery.send("recipient@example.com", "123456")
                logger.assert_not_called()
            configuration.app_env = "production"
            with self.assertLogs("nagriksetu.email", level="ERROR"), self.assertRaises(HTTPException) as unavailable:
                get_otp_delivery()
            self.assertEqual(unavailable.exception.status_code, 503)
            with patch.dict(os.environ, {"BREVO_API_KEY": "test-provider-key", "BREVO_SENDER_EMAIL": "sender@example.com"}):
                self.assertIsInstance(get_otp_delivery(), BrevoOTPDelivery)
                self.assertEqual(get_email_verification_delivery()._purpose, "email_verification")


class EmailWorkflowTests(unittest.TestCase):
    def setUp(self):
        # A hard network tripwire protects these tests even with real local env values.
        self.network = patch("app.services.email.build_opener", side_effect=AssertionError("Unmocked email delivery"))
        self.network.start()
        self.addCleanup(self.network.stop)
        legacy.BackendTests.setUp(self)
        self.verification_delivery = MagicMock()
        legacy.app.dependency_overrides[get_email_verification_delivery] = lambda: self.verification_delivery
        self.registration_delivery = MagicMock()
        legacy.app.dependency_overrides[get_registration_email_delivery] = lambda: None

    tearDown = legacy.BackendTests.tearDown
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login

    def request_verification(self):
        return self.client.post("/api/v1/auth/request-email-verification", headers=self.ch)

    def verify_email(self, code, headers=None):
        return self.client.post("/api/v1/auth/verify-email", headers=headers or self.ch, json={"otp": code})

    def test_purpose_isolation_verification_replay_and_password_contract(self):
        self.assertFalse(self.citizen["email_verified"])
        with patch("app.routers.auth.secrets.randbelow", side_effect=[123456, 654321]):
            self.assertEqual(self.client.post("/api/v1/auth/forgot-password", json={"email": "citizen@example.com"}).status_code, 200)
            self.assertEqual(self.request_verification().status_code, 200)
        self.assertEqual(self.verify_email("123456").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/auth/verify-otp", json={"email": "citizen@example.com", "otp": "654321"}).status_code, 400)
        confirmed = self.verify_email("654321")
        self.assertEqual(confirmed.status_code, 200, confirmed.text)
        self.assertTrue(confirmed.json()["email_verified"])
        self.assertEqual(self.verify_email("654321").status_code, 400)
        self.assertTrue(self.client.get("/api/v1/auth/me", headers=self.ch).json()["email_verified"])
        self.assertEqual(self.request_verification().json()["message"], "Email address is already verified")
        self.assertEqual(self.verification_delivery.send.call_count, 1)
        reset = self.client.post("/api/v1/auth/verify-otp", json={"email": "citizen@example.com", "otp": "123456"})
        self.assertEqual(reset.status_code, 200, reset.text)
        self.assertEqual(self.client.post("/api/v1/auth/reset-password", json={"reset_token": reset.json()["reset_token"],
                         "new_password": "changed-test-password"}).status_code, 200)

    def test_delivery_failure_preserves_prior_reset_and_allows_immediate_retry(self):
        auth = "/api/v1/auth/"
        identity = {"email": "citizen@example.com"}
        self.client.post(auth + "forgot-password", json=identity)
        code = self.delivery.code
        with SessionLocal() as db:
            previous = db.scalar(select(PasswordOTP))
            previous.created_at = utc_now() - timedelta(minutes=2)
            previous_id = previous.id
            db.commit()
        failing = MagicMock()
        failing.send.side_effect = EmailDeliveryUnavailable("Provider is unavailable")
        legacy.app.dependency_overrides[get_otp_delivery] = lambda: failing
        failed = self.client.post(auth + "forgot-password", json=identity)
        self.assertEqual(failed.status_code, 200, failed.text)
        self.assertEqual(failed.json(),{"message":"If the account is eligible, a password reset code has been sent"})
        with SessionLocal() as db:
            self.assertEqual(len(db.scalars(select(PasswordOTP)).all()), 1)
            self.assertFalse(db.get(PasswordOTP, previous_id).used)
        self.assertEqual(self.client.post(auth + "verify-otp", json={**identity, "otp": code}).status_code, 200)
        self.verification_delivery.send.side_effect = EmailDeliveryUnavailable("Provider is unavailable")
        self.assertEqual(self.request_verification().status_code, 503)
        with SessionLocal() as db:
            self.assertIsNone(db.scalar(select(PasswordOTP).where(PasswordOTP.purpose == "email_verification")))
        self.verification_delivery.send.side_effect = None
        self.assertEqual(self.request_verification().status_code, 200)

    def test_verification_cooldown_expiry_and_attempt_limit(self):
        self.assertEqual(self.request_verification().status_code, 200)
        code = self.verification_delivery.send.call_args.args[1]
        self.assertEqual(self.request_verification().status_code, 200)
        self.assertEqual(self.verification_delivery.send.call_count, 1)
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            self.assertEqual(self.verify_email(wrong).status_code, 400)
        self.assertEqual(self.verify_email(code).status_code, 400)
        with SessionLocal() as db:
            otp = db.scalar(select(PasswordOTP))
            self.assertEqual(otp.attempts, 5)
            otp.attempts = 0
            otp.expiry = utc_now() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.verify_email(code).status_code, 400)

    def test_verification_requires_auth_and_only_verifies_own_email(self):
        auth = "/api/v1/auth/"
        self.assertEqual(self.client.post(auth + "request-email-verification").status_code, 401)
        self.assertEqual(self.client.post(auth + "verify-email", json={"otp": "123456"}).status_code, 401)
        self.request_verification()
        code = self.verification_delivery.send.call_args.args[1]
        other = self.login("other@example.com")
        self.assertEqual(self.verify_email(code, other).status_code, 400)
        self.assertEqual(self.client.post(auth + "verify-email", headers=self.ch,
                         json={"otp": code, "email": "other@example.com"}).status_code, 422)
        self.assertEqual(self.verify_email("１２３４５６").status_code, 422)
        self.assertEqual(self.verify_email(code).status_code, 200)
        self.assertFalse(self.client.get(auth + "me", headers=other).json()["email_verified"])
        self.assertEqual(self.client.post(auth + "request-email-verification", headers=self.oh).status_code, 200)

    def test_registration_uses_configured_brevo_and_provider_failure_does_not_block_signup(self):
        legacy.app.dependency_overrides[get_registration_email_delivery] = lambda: self.registration_delivery
        with patch("app.routers.auth.secrets.randbelow", return_value=246810):
            created = self.client.post("/api/v1/auth/register", json={
                "full_name":"Verified Registration", "email":"verified@example.com",
                "password":"verified-test-password"})
        self.assertEqual(created.status_code,201,created.text)
        self.registration_delivery.send.assert_called_once_with("verified@example.com","246810")
        with SessionLocal() as db:
            otp = db.scalar(select(PasswordOTP).where(PasswordOTP.email == "verified@example.com"))
            self.assertEqual(otp.purpose,"email_verification")
        self.registration_delivery.send.side_effect = EmailDeliveryUnavailable("provider unavailable")
        failed_delivery = self.client.post("/api/v1/auth/register", json={
            "full_name":"Delivery Failure Citizen", "email":"delivery-failure@example.com",
            "password":"delivery-failure-password"})
        self.assertEqual(failed_delivery.status_code,201,failed_delivery.text)
        with SessionLocal() as db:
            self.assertIsNotNone(db.scalar(select(User).where(User.email == "delivery-failure@example.com")))
            self.assertIsNone(db.scalar(select(PasswordOTP).where(PasswordOTP.email == "delivery-failure@example.com")))

    def test_password_reset_does_not_consume_email_verification_code(self):
        self.request_verification()
        code = self.verification_delivery.send.call_args.args[1]
        auth = "/api/v1/auth/"
        self.client.post(auth + "forgot-password", json={"email": "citizen@example.com"})
        result = self.client.post(auth + "verify-otp", json={"email": "citizen@example.com", "otp": self.delivery.code})
        new_password = "changed-test-password"
        self.assertEqual(self.client.post(auth + "reset-password", json={"reset_token": result.json()["reset_token"],
                         "new_password": new_password}).status_code, 200)
        token = self.client.post(auth + "login", json={"email": "citizen@example.com", "password": new_password}).json()["access_token"]
        self.assertEqual(self.verify_email(code, {"Authorization": "Bearer " + token}).status_code, 200)
