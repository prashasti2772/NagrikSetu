"""Optional private evidence storage, independent of the SQL database engine.

Only backend-selected object names reach this adapter. Network exceptions and
provider bodies never become API errors, since they can contain credentials.
"""
from dataclasses import dataclass, field
from http.client import HTTPException as HTTPTransportError
import json
import re
import socket
import ssl
from typing import Protocol
from urllib.error import URLError, HTTPError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import uuid4
from app.core.config import integration_setting

DEFAULT_MAX_BYTES = 10 * 1024 * 1024
SIGNED_URL_SECONDS = 300


class StorageUnavailable(RuntimeError):
    def __init__(self, reason_code="storage_unavailable", status_code=None):
        self.reason_code = reason_code
        self.status_code = status_code
        super().__init__("Private evidence storage is unavailable")


@dataclass(frozen=True)
class StoredObject:
    bucket: str
    object_name: str


class EvidenceStorage(Protocol):
    max_bytes: int

    def upload(self, complaint_id: int, data: bytes, content_type: str,
               extension: str) -> StoredObject: ...

    def signed_url(self, bucket: str, object_name: str) -> str: ...

    def delete(self, stored: StoredObject) -> None: ...


class DisabledStorage:
    max_bytes = DEFAULT_MAX_BYTES

    def upload(self, complaint_id, data, content_type, extension):
        raise StorageUnavailable()

    def signed_url(self, bucket, object_name):
        raise StorageUnavailable()

    def delete(self, stored):
        raise StorageUnavailable()


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # A redirect must never forward a server credential to another origin.
        return None


@dataclass(frozen=True)
class SupabaseStorage:
    project_url: str
    secret_key: str = field(repr=False)
    bucket: str = "complaint-evidence"
    max_bytes: int = DEFAULT_MAX_BYTES

    def __post_init__(self):
        parsed = urlsplit(self.project_url)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username
                or parsed.password or parsed.query or parsed.fragment
                or parsed.path not in ("", "/")
                or any(ch.isspace() for ch in self.project_url)
                or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,254}", self.bucket)
                or not self.secret_key or self.secret_key.startswith("sb_publishable_")
                or any(ch.isspace() for ch in self.secret_key)
                or not 1 <= self.max_bytes <= 50 * 1024 * 1024):
            raise StorageUnavailable()

    def _request(self, method, path, data=None, content_type="application/json"):
        headers = {"apikey": self.secret_key, "Content-Type": content_type}
        # New opaque secret keys belong only in apikey. Legacy service-role JWTs
        # additionally use Bearer for Storage's legacy authorization contract.
        if not self.secret_key.startswith("sb_secret_"):
            headers["Authorization"] = "Bearer " + self.secret_key
        request = Request(self.project_url.rstrip("/") + "/storage/v1" + path,
                          data=data, headers=headers, method=method)
        try:
            # HTTPSHandler uses Python's verified default SSL context. No
            # unverified context, redirect, or Supabase credential in a URL.
            with build_opener(_NoRedirect()).open(request, timeout=15) as response:
                raw = response.read(65_537)
            if len(raw) > 65_536:
                raise StorageUnavailable()
            return json.loads(raw) if raw else {}
        except HTTPError as error:
            status = error.code
            error.close()
            raise StorageUnavailable("provider_rejected_request", status) from None
        except URLError as error:
            reason = error.reason
            code = ("dns_resolution_failed" if isinstance(reason, socket.gaierror) else
                    "tls_verification_failed" if isinstance(reason, ssl.SSLCertVerificationError) else
                    "network_unavailable")
            raise StorageUnavailable(code) from None
        except (OSError, HTTPTransportError, ValueError, TypeError):
            raise StorageUnavailable() from None

    def _private_bucket(self, bucket):
        # Never silently upload to a public bucket, even if its name suggests
        # privacy. The server credential bypasses RLS, so app authorization is
        # required before calling this method.
        if bucket != self.bucket:
            raise StorageUnavailable()
        result = self._request("GET", "/bucket/" + quote(bucket, safe=""))
        if not isinstance(result, dict) or result.get("public") is not False:
            raise StorageUnavailable()

    def upload(self, complaint_id, data, content_type, extension):
        from app.services.image_validation import validate_image
        validated_extension = validate_image(data, content_type, max_bytes=self.max_bytes)
        if validated_extension != extension or not isinstance(complaint_id, int) or complaint_id <= 0:
            raise StorageUnavailable()
        self._private_bucket(self.bucket)
        object_name = f"complaints/{complaint_id}/{uuid4().hex}.{validated_extension}"
        self._request("POST", "/object/" + quote(self.bucket, safe="") + "/" + object_name,
                      data, content_type)
        return StoredObject(self.bucket, object_name)

    def signed_url(self, bucket, object_name):
        self._private_bucket(bucket)
        path = "/object/sign/" + quote(bucket, safe="") + "/" + quote(object_name, safe="/")
        result = self._request("POST", path, json.dumps({"expiresIn": SIGNED_URL_SECONDS}).encode())
        signed = result.get("signedURL") if isinstance(result, dict) else None
        if not isinstance(signed, str):
            raise StorageUnavailable()
        # Storage normally returns /object/sign/...; reject foreign origins,
        # unexpected object paths, and fragments instead of relaying them.
        candidate = urlsplit(signed)
        project = urlsplit(self.project_url)
        if candidate.fragment or not candidate.query:
            raise StorageUnavailable()
        if candidate.scheme or candidate.netloc:
            if (candidate.scheme != "https" or candidate.netloc != project.netloc
                    or candidate.path != "/storage/v1" + path):
                raise StorageUnavailable()
            return signed
        if candidate.path == path:
            return self.project_url.rstrip("/") + "/storage/v1" + signed
        if candidate.path == "/storage/v1" + path:
            return self.project_url.rstrip("/") + signed
        raise StorageUnavailable()

    def delete(self, stored):
        if stored.bucket != self.bucket:
            raise StorageUnavailable()
        self._request("DELETE", "/object/" + quote(stored.bucket, safe=""),
                      json.dumps({"prefixes": [stored.object_name]}).encode())


def get_evidence_storage() -> EvidenceStorage:
    """Credentials are optional; absence never affects app import or SQLite."""
    url = integration_setting("SUPABASE_URL").strip()
    key = integration_setting("SUPABASE_SECRET_KEY").strip()
    if not url or not key:
        return DisabledStorage()
    try:
        bucket = integration_setting("SUPABASE_STORAGE_BUCKET", "complaint-evidence").strip() or "complaint-evidence"
        try:
            maximum = int(integration_setting("EVIDENCE_MAX_BYTES", str(DEFAULT_MAX_BYTES)))
        except (TypeError, ValueError):
            return DisabledStorage()
        return SupabaseStorage(url, key, bucket, maximum)
    except (ValueError, StorageUnavailable):
        return DisabledStorage()
