"""Disabled language behavior is useful and truthful without BHASHINI approval."""
import os
import unittest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import test_backend as legacy
from app.core.security import get_current_user
from app.routers import language
from app.schemas.language import TranslationRequest
from app.services.language import DisabledLanguageProvider, get_language_provider


class LanguageTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(language.router)
        self.client = TestClient(self.app)
        self.payload = {"text": "  सड़क पर गड्ढा है।\n", "source_language": "hi-IN", "target_language": "en"}

    def tearDown(self):
        self.client.close()

    def test_public_capabilities_stay_disabled_with_placeholder_configuration(self):
        with patch.dict(os.environ, {"BHASHINI_ENABLED": "true", "BHASHINI_API_KEY": "test-placeholder"}), \
             patch("urllib.request.urlopen", side_effect=AssertionError("No BHASHINI network requests")) as network:
            response = self.client.get("/api/v1/language/capabilities")
            self.assertEqual(response.status_code, 200, response.text)
            body = response.json()
            self.assertFalse(body["enabled"])
            self.assertTrue(body["pending_approval"])
            self.assertEqual(body["provider"], "bhashini")
            self.assertEqual({entry["name"] for entry in body["capabilities"]},
                             {"asr", "nmt", "tts", "ocr", "language_detection", "transliteration",
                              "audio_language_detection", "text_language_detection", "punctuation", "voice_preprocessing"})
            self.assertTrue(all(not entry["available"] and entry["status"] == "not_configured"
                                for entry in body["capabilities"]))
            self.assertIn("text_input", body["fallbacks"])
            self.assertIn("browser_speech_if_available", body["fallbacks"])
            self.assertNotIn("test-placeholder", response.text)
            network.assert_not_called()

    def test_translation_requires_authentication(self):
        for headers in ({}, {"Authorization": "Bearer invalid"}):
            response = self.client.post("/api/v1/language/translate", headers=headers, json=self.payload)
            self.assertEqual(response.status_code, 401)

    def test_translation_fallback_preserves_original_unicode_and_whitespace_for_each_role(self):
        for role in ("citizen", "authority", "admin"):
            self.app.dependency_overrides[get_current_user] = lambda: {"role": role}
            with patch("urllib.request.urlopen", side_effect=AssertionError("Unexpected network")) as network:
                response = self.client.post("/api/v1/language/translate", json=self.payload)
            self.assertEqual(response.status_code, 200, response.text)
            body = response.json()
            self.assertEqual(body["text"], self.payload["text"])
            self.assertEqual(body["original_text"], self.payload["text"])
            self.assertEqual(body["source_language"], "hi-IN")
            self.assertEqual(body["target_language"], "en")
            self.assertFalse(body["translated"])
            self.assertFalse(body["available"])
            self.assertEqual(body["status"], "unavailable")
            network.assert_not_called()

    def test_translation_rejects_blank_oversize_invalid_language_and_extra_fields(self):
        self.app.dependency_overrides[get_current_user] = lambda: {"role": "citizen"}
        for change in ({"text": " \n\t"}, {"text": "x" * 10001}, {"source_language": ""},
                       {"target_language": "../../en"}, {"service_id": "invented"}):
            response = self.client.post("/api/v1/language/translate", json={**self.payload, **change})
            self.assertEqual(response.status_code, 422, response.text)

    def test_disabled_provider_is_explicit_and_independent_of_external_configuration(self):
        provider = get_language_provider()
        self.assertIsInstance(provider, DisabledLanguageProvider)
        result = provider.translate(TranslationRequest(**self.payload))
        self.assertFalse(result.translated)
        self.assertEqual(result.text, self.payload["text"])
