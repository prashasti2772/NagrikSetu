import socket
import ssl
import unittest
from app.db.diagnose import describe_error

class DiagnosticTests(unittest.TestCase):
    def test_certificate_failure(self):
        error = ssl.SSLCertVerificationError("sensitive diagnostic")
        error.verify_code = 19
        self.assertEqual(describe_error(error), "TLS verification failed: Certificate chain root is not trusted (code 19)")

    def test_wrapped_authentication_error(self):
        inner = Exception({"C": "28P01", "M": "sensitive diagnostic"})
        outer = Exception("connection credentials")
        outer.orig = inner
        self.assertIn("password rejected", describe_error(outer))
        self.assertNotIn("sensitive", describe_error(outer))

    def test_network_failure(self):
        self.assertIn("DNS lookup failed", describe_error(socket.gaierror("sensitive host")))
        self.assertIn("timed out", describe_error(TimeoutError()))

    def test_unknown_failure_does_not_expose_details(self):
        self.assertNotIn("sensitive", describe_error(Exception("sensitive credentials")))

    def test_cyclic_exception_chain_terminates(self):
        error = Exception("sensitive")
        error.__cause__ = error
        self.assertIn("raw error withheld", describe_error(error))
