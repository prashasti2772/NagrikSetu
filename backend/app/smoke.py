"""Explicit operator smoke tests. Never called by startup or automated tests."""
import argparse
import json
import re
import secrets
import struct
import zlib
from urllib.parse import quote, urlsplit
from urllib.request import Request, build_opener
from app.core.config import integration_setting
from app.services.storage import (get_evidence_storage, SupabaseStorage, StoredObject,
    StorageUnavailable, _NoRedirect)
from app.services.image_validation import validate_image, ImageValidationError


def tiny_png():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"\x00\x50\x80\xb0")) + chunk(b"IEND", b""))


def storage_smoke():
    provider = get_evidence_storage()
    result = {"configured": isinstance(provider, SupabaseStorage), "upload": False,
              "object_path_valid": False, "signed_url": False, "private": False,
              "download": False, "validation": False, "deleted": False, "cleanup_verified": False}
    if not result["configured"]:
        return result
    if provider.bucket != "complaint-evidence":
        result["error"] = "Smoke test requires the explicitly requested complaint-evidence bucket"
        return result
    data = tiny_png()
    validate_image(data, "image/png", max_bytes=provider.max_bytes)
    rejected = 0
    for content, mime, limit in [(data, "text/plain", len(data)), (b"invalid", "image/png", 100),
                                 (data, "image/png", len(data)-1)]:
        try:
            validate_image(content, mime, max_bytes=limit)
        except ImageValidationError:
            rejected += 1
    result["validation"] = rejected == 3
    stored = None
    # Capture only our randomized path BEFORE the upload request, so a timeout
    # after a successful provider write still leaves enough information to clean up.
    original_request = provider._request
    attempted = []
    def tracking_request(method, path, payload=None, content_type="application/json"):
        prefix = "/object/" + quote(provider.bucket, safe="") + "/"
        if method == "POST" and path.startswith(prefix):
            attempted.append(StoredObject(provider.bucket, path[len(prefix):]))
        return original_request(method, path, payload, content_type)
    object.__setattr__(provider, "_request", tracking_request)
    try:
        provider._private_bucket(provider.bucket)
        result["private"] = True
        stored = provider.upload(2147483647, data, "image/png", "png")
        result["upload"] = True
        result["object_path_valid"] = bool(re.fullmatch(r"complaints/2147483647/[0-9a-f]{32}\.png", stored.object_name))
        signed = provider.signed_url(stored.bucket, stored.object_name)
        parts = urlsplit(signed)
        result["signed_url"] = bool(parts.scheme == "https" and "/object/sign/" in parts.path and parts.query)
        # No URL/token is printed, persisted, or passed via the command line.
        with build_opener(_NoRedirect()).open(Request(signed), timeout=15) as response:
            result["download"] = response.read(len(data)+1) == data
    except Exception as error:
        result["error"] = getattr(error, "reason_code", "storage_or_network_unavailable")
        status = getattr(error, "status_code", None)
        if isinstance(status, int):
            result["http_status"] = status
    finally:
        target = stored or (attempted[-1] if attempted else None)
        if target is not None:
            try:
                provider.delete(target)
                result["deleted"] = True
                folder, filename = target.object_name.rsplit("/", 1)
                rows = provider._request("POST", "/object/list/" + quote(target.bucket, safe=""),
                    json.dumps({"prefix": folder, "search": filename, "limit": 100}).encode())
                result["cleanup_verified"] = isinstance(rows, list) and not any(
                    isinstance(row, dict) and row.get("name") == filename for row in rows)
            except Exception:
                result["cleanup_error"] = "Temporary-object cleanup requires operator retry"
                # This generated non-personal path is the only identifier needed
                # for an operator to remove our test object; it is not a secret.
                result["temporary_object_path"] = target.object_name
    return result


def email_smoke():
    from email_validator import validate_email, EmailNotValidError
    from app.services.email import BrevoOTPDelivery
    key = integration_setting("BREVO_API_KEY").strip()
    sender = integration_setting("BREVO_SENDER_EMAIL").strip()
    recipient = integration_setting("BREVO_TEST_RECIPIENT").strip()
    result = {"configured": bool(key and sender), "recipient_configured": bool(recipient),
              "accepted": False}
    if not result["configured"] or not recipient:
        return result
    try:
        validate_email(recipient, check_deliverability=False)
        validate_email(sender, check_deliverability=False)
    except EmailNotValidError:
        result["error"] = "Invalid sender or explicit test recipient configuration"
        return result
    try:
        # A single purpose-labelled demonstration code, not a valid account token.
        BrevoOTPDelivery(key, sender, integration_setting("BREVO_SENDER_NAME", "NagrikSetu"),
                         "email_verification", 10).send(recipient, f"{secrets.randbelow(1000000):06d}")
        result["accepted"] = True
    except Exception:
        result["error"] = "Email provider unavailable; inspect sanitized server diagnostic"
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description="Explicit one-object/one-message live operator checks")
    parser.add_argument("provider", choices=("storage", "email"))
    parser.add_argument("--live", action="store_true", required=True,
                        help="Explicitly permit this one live provider smoke test")
    args = parser.parse_args(argv)
    result = storage_smoke() if args.provider == "storage" else email_smoke()
    print(json.dumps(result, sort_keys=True))
    success = all(result.get(k) for k in ("upload", "signed_url", "download", "validation", "cleanup_verified")) if args.provider == "storage" else result["accepted"]
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
