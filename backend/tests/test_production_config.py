"""Production guardrails using synthetic configuration and no live services."""
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

import test_backend as legacy  # Select a temporary SQLite database before app import.
from app.core.config import Settings, validate_settings
from app.db import database
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool


BACKEND = Path(__file__).resolve().parents[1]
PRODUCTION = {
    "APP_ENV": "production",
    "JWT_SECRET": "synthetic-production-test-secret-at-least-32-characters",
    "DATABASE_URL": "postgresql+pg8000://operator:synthetic-password@pooler.example.com:5432/postgres?sslmode=verify-full",
    "CORS_ORIGINS": "https://frontend.example.com",
    "GEMINI_API_KEY": "", "SUPABASE_URL": "", "SUPABASE_SECRET_KEY": "",
    "BREVO_API_KEY": "", "BREVO_SENDER_EMAIL": "",
}


class ProductionConfigurationTests(unittest.TestCase):
    def validate(self, **changes):
        with patch.dict(os.environ, {**PRODUCTION, **changes}, clear=True):
            config = Settings()
            validate_settings(config)
        return config

    def test_postgres_aliases_and_verified_tls_are_accepted(self):
        for scheme in ("postgres", "postgresql", "postgresql+pg8000"):
            for suffix in ("", "?sslmode=require", "?sslmode=verify-full"):
                self.validate(DATABASE_URL=f"{scheme}://operator:synthetic-password@pooler.example.com:5432/postgres{suffix}")

    def test_production_cannot_silently_use_sqlite_or_disable_tls(self):
        for url in ("", "  ", "sqlite:///demo.db", "sqlite+pysqlite:///:memory:",
                    "postgresql://", "postgresql://localhost", "not-a-url",
                    "postgresql://operator:synthetic-password@pooler.example.com/postgres?sslmode=disable"):
            with self.subTest(url_type=url.split(":", 1)[0]):
                with self.assertRaises(ValueError) as caught:
                    self.validate(DATABASE_URL=url)
                self.assertNotIn("synthetic-password", str(caught.exception))

    def test_production_requires_exact_https_frontend_origins(self):
        for origin in ("", "*", "http://frontend.example.com", "https://*.example.com",
                       "https://localhost", "https://127.0.0.1", "https://frontend.example.com/",
                       "https://frontend.example.com/login", "https://frontend.example.com?key=value",
                       "https://frontend.example.com#fragment", "https://user:password@frontend.example.com",
                       "https://frontend.example.com:invalid"):
            with self.subTest(origin_type=origin.split(":", 1)[0]):
                with self.assertRaisesRegex(ValueError, "CORS_ORIGINS"):
                    self.validate(CORS_ORIGINS=origin)
        config = self.validate(CORS_ORIGINS="https://frontend.example.com, https://preview.example.com:8443")
        self.assertEqual(config.cors_origins, ["https://frontend.example.com", "https://preview.example.com:8443"])

    def test_missing_production_settings_fail_before_app_import_or_migrations(self):
        # Do not inherit credentials or optional provider configuration into the child.
        host_env = {key: os.environ[key] for key in ("SystemRoot", "WINDIR", "TEMP", "TMP", "PATH") if key in os.environ}
        code = (
            "import sys\n"
            "try:\n"
            " from app.core.config import settings\n"
            "except ValueError as error:\n"
            " print(str(error))\n"
            " print('database_module_loaded=' + str('app.db.database' in sys.modules))\n"
            " sys.exit(2)\n"
            "sys.exit(0)\n"
        )
        for missing, message in (("DATABASE_URL", "PostgreSQL DATABASE_URL"),
                                 ("CORS_ORIGINS", "CORS_ORIGINS"),
                                 ("JWT_SECRET", "JWT_SECRET")):
            env = {**host_env, **PRODUCTION}
            env.pop(missing)
            result = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, env=env,
                                    capture_output=True, text=True, timeout=15)
            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertIn(message, result.stdout)
            self.assertIn("database_module_loaded=False", result.stdout)
            self.assertNotIn("synthetic-password", result.stdout + result.stderr)
            self.assertNotIn(PRODUCTION["JWT_SECRET"], result.stdout + result.stderr)

    def test_development_keeps_local_sqlite_defaults(self):
        with patch.dict(os.environ, {"APP_ENV": " Development ", "DATABASE_URL": "", "JWT_SECRET": ""}, clear=True):
            config = Settings()
            validate_settings(config)
        self.assertEqual(config.app_env, "development")
        self.assertTrue(config.database_url.startswith("sqlite:///"))
        self.assertIn("http://localhost:5173", config.cors_origins)


class DatabaseReadinessPoolTests(unittest.TestCase):
    def test_pool_exhaustion_is_reported_unavailable(self):
        # Exercise SQLAlchemy's real QueuePool timeout without opening a remote DB.
        engine = create_engine("sqlite://", poolclass=QueuePool, pool_size=1,
                               max_overflow=0, pool_timeout=0.01)
        try:
            with engine.connect(), patch.object(database, "engine", engine):
                self.assertFalse(database.check_database_connection())
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
