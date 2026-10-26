"""Nested driver diagnostics must identify causes without echoing secrets."""
import json
import socket
import ssl
import unittest
from app.db.diagnose import describe_error, safe_error_chain, exception_chain


class RecoveryDiagnosticsTests(unittest.TestCase):
    def test_ca_error_nested_in_pg8000_args_is_found(self):
        inner = ssl.SSLCertVerificationError("private fixture text")
        inner.verify_code = 62
        outer = Exception("private host", (inner,))
        self.assertIn("hostname", describe_error(outer))
        self.assertIn("certificate_verification", safe_error_chain(outer))

    def test_all_chain_branches_are_inspected(self):
        inner = ssl.SSLCertVerificationError("private fixture")
        inner.verify_code = 19
        outer = Exception("private password")
        outer.orig = ValueError("private URL")
        outer.__cause__ = inner
        self.assertIn("root is not trusted", describe_error(outer))

    def test_sqlstate_attribute_and_unknown_sensitive_text(self):
        error = Exception("private password secret")
        error.sqlstate = "28P01"
        self.assertIn("password rejected", describe_error(error))
        error.sqlstate = "sensitive"
        result = describe_error(error)
        self.assertNotIn("secret", result)
        self.assertNotIn("sensitive", result)

    def test_driver_type_and_tls_negotiation_have_distinct_controlled_messages(self):
        self.assertIn("Driver argument", describe_error(TypeError("private option=value")))
        self.assertIn("TLS negotiation", describe_error(ssl.SSLError("private CA path")))
        self.assertIn("SSL_CERT_FILE", describe_error(FileNotFoundError("private path")))
        self.assertNotIn("private", json.dumps(safe_error_chain(TypeError("private"))))

    def test_known_driver_class_is_visible_without_arguments(self):
        from pg8000.exceptions import InterfaceError
        from sqlalchemy.exc import OperationalError
        error = OperationalError("private SQL", {"private":"fixture"}, InterfaceError("private host", socket.gaierror("private DNS")))
        labels = safe_error_chain(error)
        self.assertIn("sqlalchemy.OperationalError", labels)
        self.assertIn("pg8000.InterfaceError", labels)
        self.assertIn("DNS lookup failed", describe_error(error))
        self.assertNotIn("private", json.dumps(labels))

    def test_groups_and_cycles_remain_bounded(self):
        error = ExceptionGroup("private group", [ValueError("private"), TimeoutError("private")])
        error.__cause__ = error
        self.assertLess(len(list(exception_chain(error))), 10)
        self.assertIn("timed out", describe_error(error))
