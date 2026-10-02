"""TLS configuration and health checks without remote credentials or network calls."""
import os
import ssl
import tempfile
import unittest
from unittest.mock import patch, MagicMock

import certifi
from fastapi.testclient import TestClient
from sqlalchemy import event
import test_backend as legacy  # Establishes an isolated DATABASE_URL before app import.
from app.core.config import Settings
from app.db import database
from app.main import app


class TLSDatabaseTests(unittest.TestCase):
    def test_verified_context_uses_certifi(self):
        with patch.dict(os.environ, {'SSL_CERT_FILE': ''}):
            with patch.object(database.ssl, 'create_default_context', wraps=ssl.create_default_context) as create:
                context = database.verified_ssl_context()
                create.assert_called_once_with(cafile=certifi.where())
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)
        self.assertGreater(len(context.get_ca_certs()), 0)

    def test_system_roots_are_loaded_without_weakening_verification(self):
        with patch.dict(os.environ, {'SSL_CERT_FILE': ''}):
            with patch.object(ssl.SSLContext, 'load_default_certs', autospec=True) as load_roots:
                context = database.verified_ssl_context()
                load_roots.assert_called_once_with(context, ssl.Purpose.SERVER_AUTH)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)

    def test_explicit_ca_augments_verified_context(self):
        with patch.dict(os.environ, {'SSL_CERT_FILE': certifi.where()}):
            context = database.verified_ssl_context()
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)
        with patch.dict(os.environ, {'SSL_CERT_FILE': 'missing-test-ca.pem'}):
            with self.assertRaises(FileNotFoundError):
                database.verified_ssl_context()

    def test_pg8000_receives_verified_context_for_url_aliases_and_modes(self):
        class ConfigurationCaptured(Exception):
            pass
        for scheme in ['postgres', 'postgresql', 'postgresql+pg8000']:
            for suffix in ['', '?sslmode=require', '?sslmode=verify-full']:
                engine = database.build_engine(scheme + '://localhost/example' + suffix)
                captured = {}
                def capture(dialect, record, args, params):
                    captured.update(params)
                    raise ConfigurationCaptured()
                event.listen(engine, 'do_connect', capture)
                try:
                    with self.assertRaises(ConfigurationCaptured):
                        engine.connect()
                    self.assertEqual(engine.dialect.driver, 'pg8000')
                    self.assertNotIn('sslmode', captured)
                    self.assertEqual(captured['timeout'], 10)
                    self.assertEqual(captured['ssl_context'].verify_mode, ssl.CERT_REQUIRED)
                    self.assertTrue(captured['ssl_context'].check_hostname)
                finally:
                    engine.dispose()

    def test_sqlite_fallback_and_supplied_url_health(self):
        for value in ['', '   ']:
            with patch.dict(os.environ, {'DATABASE_URL': value}):
                self.assertTrue(Settings().database_url.endswith('/backend/nagriksetu.db'))
        with tempfile.TemporaryDirectory() as folder:
            with patch.dict(os.environ, {'DATABASE_URL': 'sqlite:///' + folder + '/health.db'}):
                engine = database.build_engine(Settings().database_url)
            try:
                with patch.object(database, 'engine', engine):
                    response = TestClient(app).get('/health/db')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {'status': 'ok', 'database': 'connected'})
            finally:
                engine.dispose()

    def test_supplied_postgres_url_health_success_with_mocked_connection(self):
        with patch.dict(os.environ, {'DATABASE_URL': 'postgresql://localhost/example'}):
            engine = database.build_engine(Settings().database_url)
        connection = MagicMock()
        connection.__enter__.return_value.scalar.return_value = 1
        try:
            with patch.object(database, 'engine', engine), patch.object(engine, 'connect', return_value=connection):
                response = TestClient(app).get('/health/db')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(str(connection.__enter__.return_value.scalar.call_args.args[0]), 'SELECT 1')
        finally:
            engine.dispose()

    def test_certificate_failure_is_not_bypassed_or_exposed(self):
        engine = database.build_engine('postgresql://localhost/example')
        try:
            with patch.object(database, 'engine', engine), patch.object(engine, 'connect', side_effect=ssl.SSLCertVerificationError('private diagnostic')):
                response = TestClient(app).get('/health/db')
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json(), {'detail': 'Database unavailable'})
            self.assertNotIn('private diagnostic', response.text)
        finally:
            engine.dispose()


if __name__ == '__main__':
    unittest.main()
