"""Private storage tests use fakes exclusively, including all HTTP transport."""
import io
import json
import os
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import URLError

import test_backend as legacy
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import SessionLocal
from app.main import app
from app.models.domain import ComplaintEvidence
from app.services.image_validation import ImageValidationError, validate_image
from app.services.storage import (DEFAULT_MAX_BYTES, DisabledStorage, StorageUnavailable,
    StoredObject, SupabaseStorage, _NoRedirect, get_evidence_storage)

PNG = b"\x89PNG\r\n\x1a\n" + b"synthetic image fixture"


class FakeStorage:
    max_bytes = 128

    def __init__(self):
        self.uploads = []
        self.deleted = []
        self.accesses = []

    def upload(self, complaint_id, data, content_type, extension):
        self.uploads.append((complaint_id, data, content_type, extension))
        return StoredObject("complaint-evidence", f"complaints/{complaint_id}/test-object.png")

    def signed_url(self, bucket, object_name):
        self.accesses.append((bucket, object_name))
        return f"https://storage.example.com/storage/v1/object/sign/{bucket}/{object_name}?token=mock-access"

    def delete(self, stored):
        self.deleted.append(stored)


class StorageUnitTests(unittest.TestCase):
    def test_optional_config_and_maximums(self):
        with patch.dict(os.environ, {"SUPABASE_URL": "", "SUPABASE_SECRET_KEY": ""}):
            with patch("app.services.storage.build_opener") as network:
                storage = get_evidence_storage()
                self.assertIsInstance(storage, DisabledStorage)
                with self.assertRaises(StorageUnavailable):
                    storage.upload(1, PNG, "image/png", "png")
                network.assert_not_called()
        for invalid in ["http://project.example.com", "https://user:pass@project.example.com",
                        "https://project.example.com/?token=bad", "https://project.example.com/path"]:
            with self.assertRaises(StorageUnavailable):
                SupabaseStorage(invalid, "unit-test-secret")
        for size in (0, -1, 50 * 1024 * 1024 + 1):
            with self.assertRaises(StorageUnavailable):
                SupabaseStorage("https://project.example.com", "unit-test-secret", max_bytes=size)
        with patch.dict(os.environ, {"SUPABASE_URL": "https://project.example.com",
                                   "SUPABASE_SECRET_KEY": "unit-test-secret", "EVIDENCE_MAX_BYTES": "invalid"}):
            self.assertIsInstance(get_evidence_storage(), DisabledStorage)

    def test_signature_types_and_size(self):
        for mime, data, suffix in [("image/png", PNG, "png"),
                                  ("image/jpeg", b"\xff\xd8\xfffixture", "jpg"),
                                  ("image/webp", b"RIFF1234WEBPfixture", "webp")]:
            self.assertEqual(validate_image(data, mime, max_bytes=128), suffix)
        for data, mime, status in [(b"", "image/png", 422), (PNG, "text/plain", 415),
                                  (b"not a png", "image/png", 422), (b"x" * 129, "image/png", 413),
                                  (b"GIF89afixture", "image/gif", 415)]:
            with self.assertRaises(ImageValidationError) as error:
                validate_image(data, mime, max_bytes=128)
            self.assertEqual(error.exception.status_code, status)
        self.assertEqual(validate_image(b"GIF89afixture", "image/gif", max_bytes=128, allow_gif=True), "gif")

    def test_private_upload_random_names_and_signed_access(self):
        storage = SupabaseStorage("https://project.example.com", "unit-test-secret")
        with patch.object(SupabaseStorage, "_request", side_effect=[{"public": False}, {}, {"public": False}, {}]) as request:
            first = storage.upload(12, PNG, "image/png", "png")
            second = storage.upload(12, PNG, "image/png", "png")
        self.assertNotEqual(first.object_name, second.object_name)
        self.assertRegex(first.object_name, r"^complaints/12/[a-f0-9]{32}\.png$")
        self.assertEqual(request.call_args_list[1].args[:2], ("POST", "/object/complaint-evidence/" + first.object_name))
        signed = "/object/sign/complaint-evidence/" + first.object_name + "?token=mock-access"
        with patch.object(SupabaseStorage, "_request", side_effect=[{"public": False}, {"signedURL": signed}]) as request:
            self.assertEqual(storage.signed_url(first.bucket, first.object_name), "https://project.example.com/storage/v1" + signed)
        self.assertEqual(json.loads(request.call_args.args[2]), {"expiresIn": 300})
        with patch.object(SupabaseStorage, "_request") as request:
            storage.delete(first)
            self.assertEqual(json.loads(request.call_args.args[2]), {"prefixes": [first.object_name]})

    def test_public_bucket_foreign_urls_and_redirects_fail_closed(self):
        storage = SupabaseStorage("https://project.example.com", "unit-test-secret")
        for metadata in ({"public": True}, {}, [], {"public": "false"}):
            with patch.object(SupabaseStorage, "_request", return_value=metadata) as request:
                with self.assertRaises(StorageUnavailable):
                    storage.upload(1, PNG, "image/png", "png")
                self.assertEqual(request.call_count, 1)
        for signed in ("https://attacker.example/object?token=mock", "//attacker.example/object?token=mock",
                       "/object/public/complaint-evidence/object.png?token=mock", "javascript:alert(1)"):
            with patch.object(SupabaseStorage, "_request", side_effect=[{"public": False}, {"signedURL": signed}]):
                with self.assertRaises(StorageUnavailable):
                    storage.signed_url("complaint-evidence", "object.png")
        self.assertIsNone(_NoRedirect().redirect_request(None, None, 302, "", {}, "https://attacker.example"))

    def test_rest_headers_bounded_transport_and_safe_errors(self):
        for key, bearer in (("sb_secret_unit_test", False), ("legacy-unit-test-key", True)):
            storage = SupabaseStorage("https://project.example.com", key)
            opener = MagicMock()
            opener.open.return_value = io.BytesIO(b'{"public": false}')
            with patch("app.services.storage.build_opener", return_value=opener):
                self.assertEqual(storage._request("GET", "/bucket/complaint-evidence"), {"public": False})
            request = opener.open.call_args.args[0]
            self.assertEqual(request.get_header("Apikey"), key)
            self.assertEqual(request.get_header("Authorization"), "Bearer " + key if bearer else None)
            self.assertEqual(opener.open.call_args.kwargs, {"timeout": 15})
            self.assertNotIn(key, request.full_url)
            self.assertNotIn(key, repr(storage))
            opener.open.side_effect = URLError("provider echoed " + key)
            with patch("app.services.storage.build_opener", return_value=opener):
                with self.assertRaises(StorageUnavailable) as error:
                    storage._request("POST", "/object/test", b"data")
            self.assertNotIn(key, str(error.exception))


class EvidenceUploadTests(unittest.TestCase):
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login
    create = legacy.BackendTests.create
    assign = legacy.BackendTests.assign

    def setUp(self):
        legacy.BackendTests.setUp(self)
        self.storage = FakeStorage()
        app.dependency_overrides[get_evidence_storage] = lambda: self.storage

    tearDown = legacy.BackendTests.tearDown

    def upload(self, route, headers, data=PNG, mime="image/png", **form):
        return self.client.post(route, headers=headers, files={"file": ("../../citizen-name.png", data, mime)}, data=form)

    def test_upload_metadata_private_access_and_legacy_compatibility(self):
        complaint = self.create(self.ch)
        route = f"/api/v1/complaints/{complaint['id']}/evidence"
        result = self.upload(route + "/upload", self.ch)
        self.assertEqual(result.status_code, 201, result.text)
        evidence = result.json()
        self.assertIsNone(evidence["image_url"])
        self.assertEqual(evidence["content_type"], "image/png")
        self.assertEqual(evidence["size_bytes"], len(PNG))
        self.assertNotIn("storage_object", evidence)
        self.assertNotIn("storage_bucket", evidence)
        with SessionLocal() as db:
            row = db.get(ComplaintEvidence, evidence["id"])
            self.assertEqual(row.storage_bucket, "complaint-evidence")
            self.assertEqual(row.uploaded_by, self.citizen["id"])
        access = self.client.get(route + f"/{evidence['id']}/access", headers=self.ch)
        self.assertEqual(access.status_code, 200, access.text)
        self.assertEqual(access.json()["expires_in"], 300)
        self.assertEqual(access.headers["Cache-Control"], "no-store")
        self.assertIn("?token=", access.json()["signed_url"])
        self.assertEqual(self.client.get(route, headers=self.ch).json(), [evidence])
        external = self.client.post(route, headers=self.ch, json={"image_url": "https://example.com/evidence.jpg"}).json()
        self.assertEqual(self.client.get(route + f"/{external['id']}/access", headers=self.ch).status_code, 409)

    def test_upload_and_access_enforce_owner_staff_scope_and_resolution_role(self):
        complaint = self.create(self.ch)
        route = f"/api/v1/complaints/{complaint['id']}/evidence"
        other = self.login("other@example.com")
        outsider = self.login("outsider@example.com")
        for headers, status in (({}, 401), (other, 403), (self.oh, 403)):
            self.assertEqual(self.upload(route + "/upload", headers).status_code, status)
        self.assertEqual(self.upload(route + "/upload", self.ch, evidence_type="resolution").status_code, 403)
        self.assertEqual(self.storage.uploads, [])
        self.assign(complaint["id"])
        uploaded = self.upload(route + "/upload", self.oh, evidence_type="resolution")
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        access = route + f"/{uploaded.json()['id']}/access"
        for headers, status in (({}, 401), (other, 403), (outsider, 403), (self.ch, 200), (self.oh, 200), (self.ah, 200)):
            self.assertEqual(self.client.get(access, headers=headers).status_code, status)
        second = self.create(self.ch)
        self.assertEqual(self.client.get(f"/api/v1/complaints/{second['id']}/evidence/{uploaded.json()['id']}/access", headers=self.ch).status_code, 404)

    def test_input_mime_signature_and_size_validation_before_upload(self):
        complaint = self.create(self.ch)
        route = f"/api/v1/complaints/{complaint['id']}/evidence/upload"
        for data, mime, status in [(PNG, "text/plain", 415), (b"malformed", "image/png", 422),
                                  (b"", "image/png", 422), (b"x" * 129, "image/png", 413),
                                  (b"GIF89afixture", "image/gif", 415)]:
            result = self.upload(route, self.ch, data, mime)
            self.assertEqual(result.status_code, status, result.text)
        self.assertEqual(self.upload(route, self.ch, evidence_type="unrecognized").status_code, 422)
        self.assertEqual(self.storage.uploads, [])

    def test_disabled_provider_and_provider_failure_leave_complaint_available(self):
        complaint = self.create(self.ch)
        route = f"/api/v1/complaints/{complaint['id']}/evidence/upload"
        app.dependency_overrides.pop(get_evidence_storage)
        with patch.dict(os.environ, {"SUPABASE_URL": "", "SUPABASE_SECRET_KEY": ""}), patch("app.services.storage.build_opener") as network:
            self.assertEqual(self.upload(route, self.ch).status_code, 503)
            network.assert_not_called()
        app.dependency_overrides[get_evidence_storage] = lambda: self.storage
        with patch.object(self.storage, "upload", side_effect=StorageUnavailable()):
            self.assertEqual(self.upload(route, self.ch).status_code, 503)
        with SessionLocal() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(ComplaintEvidence)), 0)
        self.assertEqual(self.client.get(f"/api/v1/complaints/{complaint['id']}", headers=self.ch).status_code, 200)

    def test_database_failure_attempts_object_cleanup(self):
        complaint = self.create(self.ch)
        route = f"/api/v1/complaints/{complaint['id']}/evidence/upload"
        with patch("sqlalchemy.orm.Session.commit", side_effect=SQLAlchemyError("synthetic database failure")):
            result = self.upload(route, self.ch)
        self.assertEqual(result.status_code, 503, result.text)
        self.assertEqual(len(self.storage.deleted), 1)
        with SessionLocal() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(ComplaintEvidence)), 0)


if __name__ == "__main__":
    unittest.main()
