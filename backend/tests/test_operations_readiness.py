"""Configuration diagnostics must be useful without any live provider checks."""
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import test_backend as legacy
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers import health
from app.services.storage import DisabledStorage, SupabaseStorage


class OperationsReadinessTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(health.router)
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()

    def test_disabled_integrations_are_optional_and_do_not_probe_database_or_network(self):
        with patch.object(health, "settings", SimpleNamespace(gemini_api_key="")), \
             patch.object(health, "integration_setting", return_value=""), \
             patch.object(health, "get_evidence_storage", return_value=DisabledStorage()), \
             patch.object(health, "check_database_connection") as database, \
             patch("urllib.request.OpenerDirector.open", side_effect=AssertionError("No network health probes")) as network:
            response = self.client.get("/health/integrations")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(response.json(), {
            "check": "configuration_only", "live_checks_performed": False,
            "integrations": {"gemini": {"status": "not_configured"},
                             "storage": {"status": "not_configured"},
                             "email": {"status": "not_configured"},
                             "bhashini": {"status": "not_configured", "pending_approval": True}}})
        database.assert_not_called()
        network.assert_not_called()

    def test_configured_integrations_return_no_configuration_values_or_live_claims(self):
        fixture_value = "synthetic-configuration-marker"
        storage = SupabaseStorage("https://storage.example.com", fixture_value)
        with patch.object(health, "settings", SimpleNamespace(gemini_api_key=fixture_value)), \
             patch.object(health, "integration_setting", return_value=fixture_value), \
             patch.object(health, "get_evidence_storage", return_value=storage), \
             patch("urllib.request.OpenerDirector.open", side_effect=AssertionError("No network health probes")) as network:
            response = self.client.get("/health/integrations")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["live_checks_performed"])
        for name in ("gemini", "storage", "email"):
            self.assertEqual(response.json()["integrations"][name], {"status": "configured"})
        self.assertEqual(response.json()["integrations"]["bhashini"]["status"], "not_configured")
        self.assertNotIn(fixture_value, response.text)
        self.assertNotIn("example.com", response.text)
        self.assertNotIn("complaint-evidence", response.text)
        network.assert_not_called()

    def test_partial_email_configuration_does_not_claim_ready(self):
        for missing in ("BREVO_API_KEY", "BREVO_SENDER_EMAIL"):
            with patch.object(health, "settings", SimpleNamespace(gemini_api_key="")), \
                 patch.object(health, "get_evidence_storage", return_value=DisabledStorage()), \
                 patch.object(health, "integration_setting", side_effect=lambda key: " " if key == missing else "synthetic-value"):
                response = self.client.get("/health/integrations")
            self.assertEqual(response.json()["integrations"]["email"]["status"], "not_configured")

    def test_existing_readiness_response_remains_database_only(self):
        for connected in (True, False):
            with patch.object(health, "check_database_connection", return_value=connected), \
                 patch.object(health, "get_evidence_storage", side_effect=AssertionError("Optional providers do not gate DB readiness")):
                response = self.client.get("/health/ready")
            self.assertEqual(response.status_code, 200 if connected else 503)
            self.assertEqual(response.json(), {
                "status": "ok" if connected else "unavailable",
                "database": {"provider": health.engine.dialect.name, "connected": connected}})


if __name__ == "__main__":
    unittest.main()
