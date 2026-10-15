"""Bounded MIME and file-signature checks shared by optional image adapters."""


class ImageValidationError(ValueError):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def validate_image(data: bytes, content_type: str | None, *, max_bytes: int,
                   allow_gif: bool = False) -> str:
    """Return a server-selected extension, never one supplied in a filename.

    These checks establish image format, not whether an image depicts a real
    civic issue. They deliberately do not make a complaint depend on image AI.
    """
    if len(data) > max_bytes:
        raise ImageValidationError(413, "Image exceeds the configured size limit")
    if not data:
        raise ImageValidationError(422, "Image must not be empty")
    signatures = {
        "image/jpeg": ("jpg", data.startswith(b"\xff\xd8\xff")),
        "image/png": ("png", data.startswith(b"\x89PNG\r\n\x1a\n")),
        "image/webp": ("webp", len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"),
    }
    if allow_gif:
        signatures["image/gif"] = ("gif", data.startswith((b"GIF87a", b"GIF89a")))
    mime = (content_type or "").strip().lower()
    if mime not in signatures:
        raise ImageValidationError(415, "Unsupported image MIME type")
    extension, valid = signatures[mime]
    if not valid:
        raise ImageValidationError(422, "Image signature does not match its MIME type")
    return extension
