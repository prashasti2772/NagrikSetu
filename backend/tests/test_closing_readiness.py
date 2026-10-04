import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch
import test_backend as legacy
from app.services.storage import StoredObject
from app.smoke import storage_smoke, email_smoke, tiny_png
from app.services.image_validation import validate_image

class ClosingReadinessTests(unittest.TestCase):
    setUp=legacy.BackendTests.setUp
    tearDown=legacy.BackendTests.tearDown
    register=legacy.BackendTests.register
    login=legacy.BackendTests.login

    def test_readiness_reports_provider_without_url_or_secret(self):
        response=self.client.get("/health/ready")
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json(),{"status":"ok","database":{"provider":"sqlite","connected":True}})
        with patch("app.routers.health.check_database_connection",return_value=False):
            response=self.client.get("/health/ready")
            self.assertEqual(response.status_code,503)
            self.assertFalse(response.json()["database"]["connected"])
        self.assertNotIn("sqlite:",response.text)
        self.assertNotIn("password",response.text.lower())

class SmokeSafetyTests(unittest.TestCase):
    def test_generated_png_and_validation(self):
        self.assertEqual(validate_image(tiny_png(),"image/png",max_bytes=1024),"png")
        self.assertLess(len(tiny_png()),1024)

    def test_email_smoke_never_sends_without_explicit_recipient(self):
        values={"BREVO_API_KEY":"unit-test-only","BREVO_SENDER_EMAIL":"sender@example.com"}
        with patch("app.smoke.integration_setting",side_effect=lambda name,default="":values.get(name,default)), patch("app.services.email.BrevoOTPDelivery.send") as send:
            result=email_smoke()
        self.assertFalse(result["recipient_configured"])
        send.assert_not_called()

    def test_storage_dns_error_is_actionable_without_provider_details(self):
        import socket
        from urllib.error import URLError
        from app.services.storage import SupabaseStorage, StorageUnavailable
        provider = SupabaseStorage("https://example.com", "sb_secret_unit_fixture")
        with patch("app.services.storage.build_opener") as opener:
            opener.return_value.open.side_effect = URLError(socket.gaierror(11001, "private-host"))
            with self.assertRaises(StorageUnavailable) as caught:
                provider._request("GET", "/bucket/complaint-evidence")
        self.assertEqual(caught.exception.reason_code, "dns_resolution_failed")
        self.assertNotIn("private-host", str(caught.exception))
        self.assertNotIn("sb_secret", str(caught.exception))

    def test_storage_smoke_cleans_up_even_when_signing_fails(self):
        from app.services.storage import SupabaseStorage, StorageUnavailable
        provider=SupabaseStorage("https://example.com","sb_secret_unit_fixture")
        calls=[]
        def transport(method,path,payload=None,content_type="application/json"):
            calls.append((method,path))
            if path.startswith("/bucket/"): return {"public":False}
            if "/object/sign/" in path: raise StorageUnavailable()
            if "/object/list/" in path: return []
            return {}
        with patch("app.smoke.get_evidence_storage",return_value=provider), patch.object(SupabaseStorage,"_request",side_effect=transport):
            result=storage_smoke()
        self.assertTrue(result["upload"])
        self.assertFalse(result["signed_url"])
        self.assertTrue(result["deleted"])
        self.assertTrue(result["cleanup_verified"])
        self.assertTrue(any(method=="DELETE" for method,_ in calls))
        self.assertNotIn("sb_secret",json.dumps(result))

if __name__=="__main__":
    unittest.main()
