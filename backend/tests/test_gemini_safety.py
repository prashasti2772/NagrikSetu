"""Optional Gemini assistance cannot interrupt the local reporting workflow."""
import json
import unittest
from unittest.mock import Mock, patch
import test_backend as legacy
from app.db.database import SessionLocal
from app.models.complaint import Complaint
from app.services.gemini import GeminiService, get_gemini_service, sanitize_user_text


class GeminiSafetyTests(unittest.TestCase):
    setUp = legacy.BackendTests.setUp
    tearDown = legacy.BackendTests.tearDown
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login
    create = legacy.BackendTests.create
    assign = legacy.BackendTests.assign

    def test_provider_exception_uses_local_chat_draft_and_does_not_block_submission(self):
        provider = Mock()
        provider.chat_reply.side_effect = RuntimeError("Private provider request details")
        provider.analyze_issue.side_effect = RuntimeError("Private provider request details")
        legacy.app.dependency_overrides[get_gemini_service] = lambda: provider
        faq = self.client.post("/api/v1/chatbot/message", json={"message": "How do I report an issue?"})
        self.assertEqual(faq.status_code, 200, faq.text)
        self.assertEqual(faq.json()["topic"], "reporting")
        self.assertNotIn("Private provider request details", faq.text)
        response = self.client.post("/api/v1/chatbot/analyze", data={"message": "Pothole in the road"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["ai_provider"], "local")
        self.assertNotIn("Private provider request details", response.text)
        complaint = self.create(self.ch)
        self.assertEqual(complaint["status"], "submitted")
        self.assertEqual(provider.analyze_issue.call_count, 1)
        with SessionLocal() as db:
            self.assertEqual(db.query(Complaint).count(), 1)

    def test_malformed_provider_outputs_fall_back_without_response_validation_errors(self):
        provider = Mock()
        legacy.app.dependency_overrides[get_gemini_service] = lambda: provider
        for output in ([], {"title": "Bad draft"}, {"title": 7, "description": "Text", "assistant_message": "Review"}):
            provider.analyze_issue.return_value = output
            response = self.client.post("/api/v1/chatbot/analyze", data={"message": "Pothole on road"})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["ai_provider"], "local")
        provider.chat_reply.return_value = {"answer": {"unexpected": "shape"}, "suggestions": []}
        response = self.client.post("/api/v1/chatbot/message", json={"message": "How do I report an issue?"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["topic"], "reporting")

    def test_private_complaint_lookup_never_calls_gemini(self):
        complaint = self.create(self.ch)
        provider = Mock()
        legacy.app.dependency_overrides[get_gemini_service] = lambda: provider
        payload = {"message": "Status please", "complaint_id": complaint["id"]}
        own = self.client.post("/api/v1/chatbot/message", headers=self.ch, json=payload)
        self.assertEqual(own.status_code, 200)
        self.assertEqual(own.json()["complaint"]["id"], complaint["id"])
        denied = self.client.post("/api/v1/chatbot/message", headers=self.login("other@example.com"), json=payload)
        self.assertEqual(denied.status_code, 404)
        provider.chat_reply.assert_not_called()
        provider.analyze_issue.assert_not_called()

    def test_explicit_valid_image_passed_to_provider_without_filename_or_private_text(self):
        provider = Mock()
        provider.analyze_issue.return_value = {"title": "Possible pothole", "description": "Road appears damaged.",
                                              "assistant_message": "Please review this draft."}
        legacy.app.dependency_overrides[get_gemini_service] = lambda: provider
        data = b"\x89PNG\r\n\x1a\nfixture-image-content"
        response = self.client.post("/api/v1/chatbot/analyze",
            data={"message": "Pothole citizen@example.com OTP 778899"},
            files={"image": ("../../private-name.png", data, "image/png")})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["ai_provider"], "gemini")
        self.assertTrue(response.json()["requires_user_confirmation"])
        sent_message, sent_data, sent_mime = provider.analyze_issue.call_args.args
        self.assertNotIn("citizen@example.com", sent_message)
        self.assertNotIn("778899", sent_message)
        self.assertEqual(sent_data, data)
        self.assertEqual(sent_mime, "image/png")
        self.assertNotIn("private-name", str(provider.analyze_issue.call_args))

    def test_mime_signature_and_size_rejections_never_reach_gemini(self):
        provider = Mock()
        legacy.app.dependency_overrides[get_gemini_service] = lambda: provider
        for data, mime, status in ((b"not an image", "image/jpeg", 415),
                                   (b"GIF89a" + b"x", "application/octet-stream", 415),
                                   (b"\x89PNG\r\n\x1a\n" + b"x" * (5 * 1024 * 1024), "image/png", 413)):
            response = self.client.post("/api/v1/chatbot/analyze", files={"image": ("test", data, mime)})
            self.assertEqual(response.status_code, status, response.text)
        provider.analyze_issue.assert_not_called()


class GeminiAdapterSafetyTests(unittest.TestCase):
    def test_unexpected_network_and_malformed_response_fail_locally(self):
        service = GeminiService("mock-only-key", "mock-model")
        with patch("app.services.gemini.urlopen", side_effect=RuntimeError("Unsafe provider diagnostics")):
            self.assertIsNone(service.analyze_issue("Road damage"))
            self.assertIsNone(service.chat_reply("How do I report an issue?"))
        with patch("app.services.gemini.urlopen") as network:
            self.assertIsNone(GeminiService("", "mock-model").analyze_issue("Road damage"))
            network.assert_not_called()

    def test_chat_uses_trusted_project_facts_and_sanitizes_response_suggestions(self):
        service = GeminiService("mock-only-key", "mock-model")
        with patch.object(service, "_generate_json", return_value={
            "answer": "Review your civic report.", "suggestions": ["Email citizen@example.com", "OTP 778899"]
        }) as generate:
            answer = service.chat_reply("How to report? password secret123")
        prompt = generate.call_args.args[0]
        self.assertIn("Trusted project facts", prompt)
        self.assertIn("verification_pending", prompt)
        self.assertNotIn("secret123", prompt)
        self.assertNotIn("citizen@example.com", json.dumps(answer))
        self.assertNotIn("778899", json.dumps(answer))
        self.assertEqual(sanitize_user_text("road\x00\x1b\nissue"), "road\nissue")
