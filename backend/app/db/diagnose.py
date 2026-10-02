"""Credential-safe database diagnostic: python -m app.db.diagnose."""
import socket
import ssl


def describe_error(error):
    """Return only controlled messages and selected certificate/SQLSTATE codes."""
    seen = set()
    current = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, ssl.SSLCertVerificationError):
            code = getattr(current, "verify_code", None)
            reasons = {
                10: "Certificate expired",
                18: "Self-signed server certificate is not trusted",
                19: "Certificate chain root is not trusted",
                20: "Certificate issuer is missing from the trust chain",
                21: "Unable to verify the server certificate chain",
                62: "Certificate hostname does not match DATABASE_URL host",
            }
            return "TLS verification failed: " + reasons.get(code, "Certificate rejected") + (f" (code {code})" if isinstance(code, int) else "")
        for arg in getattr(current, "args", ()):
            if isinstance(arg, dict):
                code = arg.get("C")
                if code == "28P01":
                    return "Authentication failed: database password rejected (28P01)"
                if code == "28000":
                    return "Authentication failed: database user or access configuration rejected (28000)"
                if code == "3D000":
                    return "Database name does not exist (3D000)"
                if isinstance(code, str) and len(code) == 5 and code.isascii() and code.isalnum():
                    return "PostgreSQL rejected the connection/query (SQLSTATE " + code + ")"
        if isinstance(current, socket.gaierror):
            return "DNS lookup failed for the configured database host"
        if isinstance(current, (TimeoutError, socket.timeout)):
            return "Connection timed out; check database availability, network and port"
        if isinstance(current, ConnectionRefusedError):
            return "Connection refused; check database availability and port"
        current = getattr(current, "orig", None) or current.__cause__ or current.__context__
    return "Connection failed without a recognized TLS/SQLSTATE code; raw error withheld to protect credentials"


def main():
    import os
    from pathlib import Path
    try:
        from sqlalchemy import text
        from app.db.database import engine
        print("Database:", engine.dialect.name)
        ca = os.getenv("SSL_CERT_FILE", "").strip()
        print("Custom CA:", "file exists" if ca and Path(ca).is_file() else "not configured or missing")
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            print("Connection successful")
            return 0
        finally:
            engine.dispose()
    except Exception as error:
        print(describe_error(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
