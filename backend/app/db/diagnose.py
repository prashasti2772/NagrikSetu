"""Credential-safe database diagnostic: python -m app.db.diagnose."""
import socket
import ssl


def exception_chain(error):
    """Visit all wrapped branches, including pg8000 exceptions nested in args."""
    pending, seen = [error], set()
    while pending and len(seen) < 64:
        current = pending.pop(0)
        if id(current) in seen or not isinstance(current, (BaseException, list, tuple, dict)):
            continue
        seen.add(id(current))
        if isinstance(current, BaseException):
            yield current
            pending.extend(getattr(current, name, None) for name in ("orig", "__cause__", "__context__"))
            pending.extend(current.args)
            pending.extend(getattr(current, "exceptions", ()))
        elif isinstance(current, dict):
            pending.extend(current.values())
        else:
            pending.extend(current)


def safe_error_chain(error):
    """Controlled type labels only: never format an exception or its arguments."""
    labels = []
    for current in exception_chain(error):
        if isinstance(current, ssl.SSLCertVerificationError): label = "certificate_verification"
        elif isinstance(current, ssl.SSLError): label = "tls"
        elif isinstance(current, socket.gaierror): label = "dns"
        elif isinstance(current, TimeoutError): label = "timeout"
        elif isinstance(current, ConnectionRefusedError): label = "connection_refused"
        elif isinstance(current, FileNotFoundError): label = "file_not_found"
        elif isinstance(current, PermissionError): label = "permission"
        elif isinstance(current, TypeError): label = "driver_argument_type"
        elif isinstance(current, ValueError): label = "configuration_value"
        elif type(current).__module__.startswith(("sqlalchemy.", "pg8000.")):
            name = type(current).__name__
            allowed = {"InterfaceError", "OperationalError", "DatabaseError", "ProgrammingError", "InternalError", "IntegrityError", "DataError", "DBAPIError", "ArgumentError", "NoSuchModuleError"}
            label = ("pg8000." if type(current).__module__.startswith("pg8000.") else "sqlalchemy.") + (name if name in allowed else "driver_error")
        elif isinstance(current, OSError): label = "network_or_file_os_error"
        else: label = "unclassified_exception"
        if label not in labels: labels.append(label)
    return labels


def describe_error(error):
    """Return only controlled messages and selected certificate/SQLSTATE codes."""
    chain = list(exception_chain(error))
    # Prefer the underlying certificate error over a generic wrapper or SQLSTATE.
    for current in chain:
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
    for current in chain:
        codes = [getattr(current, "sqlstate", None), getattr(current, "pgcode", None)]
        for arg in getattr(current, "args", ()):
            if isinstance(arg, dict):
                codes.extend((arg.get("C"), arg.get("sqlstate")))
        for code in codes:
            if code == "28P01":
                return "Authentication failed: database password rejected (28P01)"
            if code == "28000":
                return "Authentication failed: database user or access configuration rejected (28000)"
            if code == "3D000":
                return "Database name does not exist (3D000)"
            if isinstance(code, str) and len(code) == 5 and code.isascii() and code.isalnum() and code == code.upper():
                return "PostgreSQL rejected the connection/query (SQLSTATE " + code + ")"
    for current in chain:
        if isinstance(current, socket.gaierror):
            return "DNS lookup failed for the configured database host"
        if isinstance(current, (TimeoutError, socket.timeout)):
            return "Connection timed out; check database availability, network and port"
        if isinstance(current, ConnectionRefusedError):
            return "Connection refused; check database availability and port"
        if isinstance(current, ssl.SSLError):
            return "TLS negotiation or CA parsing failed; check the trusted PEM bundle and server TLS support"
        if isinstance(current, FileNotFoundError):
            return "Configured file was not found; check the SSL_CERT_FILE mount"
        if isinstance(current, PermissionError):
            return "Access denied to a configured file or network resource"
    for current in chain:
        if isinstance(current, TypeError):
            return "Driver argument configuration failed (TypeError); check DATABASE_URL query options against pg8000"
        if isinstance(current, ValueError):
            return "Configuration validation failed (ValueError); check production settings and DATABASE_URL syntax"
    return "Connection failed without a recognized TLS/SQLSTATE code; raw error withheld to protect credentials"


def main():
    import json
    import os
    from pathlib import Path
    stage = "configuration_and_engine"
    report = {"read_only": True, "migrations_run": False}
    try:
        from sqlalchemy import text
        from app.db.database import engine
        report["database_provider"] = engine.dialect.name
        ca = os.getenv("SSL_CERT_FILE", "").strip()
        report["custom_ca"] = "file_exists" if ca and Path(ca).is_file() else "not_configured_or_missing"
        from sqlalchemy.engine import make_url
        url = make_url(engine.url)
        report["port_is_5432"] = url.port == 5432
        report["pooled_username_format"] = bool(url.username and url.username.startswith("postgres."))
        from app.core.config import settings
        report["tls_certificate_and_hostname_verification"] = (
            make_url(settings.database_url).query.get("sslmode", "verify-full") != "disable"
            if engine.dialect.name == "postgresql" else None)
        try:
            stage = "connect"
            with engine.connect() as connection:
                stage = "select_1"
                connection.execute(text("SELECT 1"))
            report.update(status="connected", stage="complete")
            print(json.dumps(report))
            return 0
        finally:
            engine.dispose()
    except Exception as error:
        report.update(status="failed", stage=stage, diagnosis=describe_error(error), error_chain=safe_error_chain(error))
        print(json.dumps(report))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
