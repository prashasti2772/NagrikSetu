import os
import unittest
from unittest.mock import patch

import test_backend as legacy
from app.core.otp import get_email_verification_delivery
from app.core.rate_limit import limiter
from app.db.database import SessionLocal
from app.models.complaint import utc_now
from app.models.domain import User
from app.services.identity import (AadhaarOfflineProvider, DigiLockerProvider,
                                   IdentityProviderUnavailable)


class IdentityTests(unittest.TestCase):
    def setUp(self):
        self.flags = patch.dict(os.environ, {"ENABLE_DEMO_IDENTITY": "false", "STAFF_REQUIRE_VERIFIED_EMAIL": "false"})
        self.flags.start()
        self.addCleanup(self.flags.stop)
        legacy.BackendTests.setUp(self)

    tearDown = legacy.BackendTests.tearDown
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login
    create = legacy.BackendTests.create
    assign = legacy.BackendTests.assign
    route = "/api/v1/users/me/verification"

    def test_identity_is_optional_and_email_state_uses_existing_flag(self):
        response = self.client.get(self.route, headers=self.ch)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "unverified")
        self.assertFalse(response.json()["identity_verified"])
        self.assertIsNone(response.json()["provider"])
        self.assertEqual(self.create(self.ch)["citizen_id"], self.citizen["id"])
        with SessionLocal() as db:
            db.get(User, self.citizen["id"]).email_verified = True
            db.commit()
        state = self.client.get(self.route, headers=self.ch).json()
        self.assertEqual(state["status"], "email_verified")
        self.assertFalse(state["identity_verified"])
        self.assertIsNone(state["verified_at"])

    def test_demo_requires_explicit_development_flag_and_is_honest(self):
        self.assertEqual(self.client.post(self.route + "/demo", headers=self.ch, json={}).status_code, 503)
        with patch.dict(os.environ, {"ENABLE_DEMO_IDENTITY": "true", "APP_ENV": "production"}):
            self.assertEqual(self.client.post(self.route + "/demo", headers=self.ch, json={}).status_code, 503)
        with patch.dict(os.environ, {"ENABLE_DEMO_IDENTITY": "true", "APP_ENV": "development"}):
            response = self.client.post(self.route + "/demo", headers=self.ch, json={})
            self.assertEqual(response.status_code, 200, response.text)
            state = response.json()
            self.assertEqual(state["status"], "demo_verified")
            self.assertEqual(state["display_label"], "Demo Verified Citizen")
            self.assertTrue(state["is_demo"])
            self.assertFalse(state["identity_verified"])
            self.assertFalse(state["email_verified"])
            self.assertEqual(state["provider"], "demo")
            self.assertTrue(state["verified_at"])
            repeated = self.client.post(self.route + "/demo", headers=self.ch, json={}).json()
            self.assertEqual(repeated["verified_at"], state["verified_at"])
        # Changing configuration never turns an old demo outcome into real verification.
        persisted = self.client.get(self.route, headers=self.ch).json()
        self.assertTrue(persisted["is_demo"])
        self.assertFalse(persisted["identity_verified"])

    def test_identity_ownership_privilege_and_raw_identity_input_restrictions(self):
        self.assertEqual(self.client.get(self.route).status_code, 401)
        self.assertEqual(self.client.post(self.route + "/demo", json={}).status_code, 401)
        for headers in (self.oh, self.ah):
            self.assertEqual(self.client.get(self.route, headers=headers).status_code, 403)
            self.assertEqual(self.client.post(self.route + "/demo", headers=headers, json={}).status_code, 403)
        with patch.dict(os.environ, {"ENABLE_DEMO_IDENTITY": "true", "APP_ENV": "development"}):
            for prohibited in ("aadhaar_number", "document", "identity_verified", "user_id", "provider", "token"):
                response = self.client.post(self.route + "/demo", headers=self.ch, json={prohibited: "not-real-identity-data"})
                self.assertEqual(response.status_code, 422)
                self.assertNotIn("not-real-identity-data", response.text)
            self.assertEqual(self.client.post(self.route + "/demo", headers=self.ch, json={}).status_code, 200)
        other_state = self.client.get(self.route, headers=self.login("other@example.com")).json()
        self.assertEqual(other_state["status"], "unverified")
        self.assertEqual(self.client.patch("/api/v1/auth/me", headers=self.ch, json={"identity_status": "identity_verified"}).status_code, 422)

    def test_unapproved_providers_never_connect_or_accept_identity_material(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("Identity providers must not connect")) as network:
            for provider in (DigiLockerProvider(), AadhaarOfflineProvider()):
                self.assertFalse(provider.available)
                with self.assertRaises(IdentityProviderUnavailable):
                    provider.verify()
            network.assert_not_called()
        providers = self.client.get(self.route, headers=self.ch).json()["providers"]
        statuses = {item["provider"]: item for item in providers}
        self.assertEqual(statuses["digilocker"]["status"], "pending_external_approval")
        self.assertFalse(statuses["aadhaar_offline"]["available"])

    def test_demo_cannot_replace_future_trusted_outcome(self):
        with SessionLocal() as db:
            user = db.get(User, self.citizen["id"])
            user.identity_status = "identity_verified"
            user.identity_provider = "test_trusted_provider"
            user.identity_verified_at = utc_now()
            db.commit()
        with patch.dict(os.environ, {"ENABLE_DEMO_IDENTITY": "true", "APP_ENV": "development"}):
            self.assertEqual(self.client.post(self.route + "/demo", headers=self.ch, json={}).status_code, 409)
        state = self.client.get(self.route, headers=self.ch).json()
        self.assertEqual(state["status"], "identity_verified")
        self.assertTrue(state["identity_verified"])
        self.assertFalse(state["is_demo"])

    def test_staff_email_policy_covers_generic_privileged_routes_without_lockout(self):
        report = self.create(self.ch)
        self.assign(report["id"])
        cid = report["id"]
        self.assertEqual(self.client.get("/api/v1/authority/dashboard", headers=self.oh).status_code, 200)
        with patch.dict(os.environ, {"STAFF_REQUIRE_VERIFIED_EMAIL": "true"}):
            for path, headers in [
                ("/api/v1/authority/dashboard", self.oh), ("/api/v1/admin/users", self.ah),
                ("/api/v1/complaints", self.oh), (f"/api/v1/complaints/{cid}", self.oh),
                (f"/api/v1/complaints/{cid}/timeline", self.oh),
                (f"/api/v1/complaints/{cid}/evidence", self.oh),
                ("/api/v1/authority/incidents", self.oh),
            ]:
                result = self.client.get(path, headers=headers)
                self.assertEqual(result.status_code, 403, (path, result.text))
            # A generic assistant endpoint cannot bypass the staff account policy.
            response = self.client.post("/api/v1/chatbot/message", headers=self.oh,
                                        json={"message": "status", "complaint_id": cid})
            self.assertEqual(response.status_code, 403)
            self.assertEqual(self.client.get("/api/v1/auth/me", headers=self.oh).status_code, 200)
            self.assertEqual(self.client.patch("/api/v1/auth/me", headers=self.oh, json={"full_name": "Updated Officer"}).status_code, 200)
            delivery = legacy.Delivery()
            legacy.app.dependency_overrides[get_email_verification_delivery] = lambda: delivery
            self.assertEqual(self.client.post("/api/v1/auth/request-email-verification", headers=self.oh).status_code, 200)
            verified = self.client.post("/api/v1/auth/verify-email", headers=self.oh, json={"otp": delivery.code})
            self.assertEqual(verified.status_code, 200, verified.text)
            self.assertEqual(self.client.get("/api/v1/authority/dashboard", headers=self.oh).status_code, 200)
            self.assertEqual(self.client.get("/api/v1/admin/users", headers=self.oh).status_code, 403)
            self.assertEqual(self.client.get("/api/v1/admin/users", headers=self.ah).status_code, 403)
            self.assertEqual(self.create(self.ch)["citizen_id"], self.citizen["id"])

    def test_citizen_signup_cannot_grant_privileges_and_inactive_staff_stay_blocked(self):
        limiter.clear()  # Isolate schema/privilege checks from setup's registration requests.
        for extra in ({"role": "admin"}, {"role": "authority"}, {"department_id": 1}, {"email_verified": True}):
            response = self.client.post("/api/v1/auth/register", json={"full_name": "User", "email": "safe@example.com",
                                        "password": self.password, **extra})
            self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.post("/api/v1/admin/authorities", headers=self.ch, json={}).status_code, 403)
        officer_id = self.client.get("/api/v1/auth/me", headers=self.oh).json()["id"]
        with SessionLocal() as db:
            officer = db.get(User, officer_id)
            officer.email_verified = True
            officer.is_active = False
            db.commit()
        self.assertEqual(self.client.get("/api/v1/authority/dashboard", headers=self.oh).status_code, 401)
