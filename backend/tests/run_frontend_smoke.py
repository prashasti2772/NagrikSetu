"""Run the actual frontend fetch service against a temporary FastAPI server."""
import argparse
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import threading
import tempfile
import time
from urllib.request import urlopen


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--frontend", required=True, type=Path)
    args = parser.parse_args()
    frontend = args.frontend.resolve()
    if not (frontend / "tests/live-api-smoke.mjs").is_file():
        parser.error("Frontend smoke script was not found")
    with tempfile.TemporaryDirectory() as temporary:
        os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(temporary) / "smoke.db")
        os.environ["APP_ENV"] = "development"
        os.environ["JWT_SECRET"] = secrets.token_urlsafe(48)
        from app.db.database import engine, SessionLocal
        from app.db.initialize import initialize_database
        from app.models.domain import User
        from app.core.security import password_hasher
        initialize_database(engine)
        password = secrets.token_urlsafe(24)
        with SessionLocal() as db:
            db.add(User(full_name="Smoke Admin", email="smoke.admin@example.com",
                        role="admin", password_hash=password_hasher.hash(password)))
            db.commit()
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        import uvicorn
        server = uvicorn.Server(uvicorn.Config("app.main:app", host="127.0.0.1",
                                               port=port, log_level="error"))
        worker = threading.Thread(target=server.run, daemon=True)
        worker.start()
        try:
            for _ in range(100):
                try:
                    with urlopen(f"http://127.0.0.1:{port}/health/db", timeout=1) as response:
                        assert json.load(response)["database"] == "connected"
                    break
                except Exception:
                    time.sleep(0.1)
            else:
                raise RuntimeError("Backend startup failed; inspect server configuration")
            environment = {**os.environ, "SMOKE_API_BASE":f"http://127.0.0.1:{port}",
                           "SMOKE_PASSWORD":password}
            subprocess.run(["node", "tests/live-api-smoke.mjs"], cwd=frontend,
                           env=environment, check=True)
            print("PASS: Uvicorn startup, migrations and SQLite health; temporary database only.")
        finally:
            server.should_exit = True
            worker.join(timeout=10)
            engine.dispose()
            if worker.is_alive():
                raise RuntimeError("Smoke server failed to shut down")


if __name__ == "__main__":
    main()
