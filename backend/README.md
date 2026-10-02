# NagrikSetu backend

## Install and run (PowerShell)

From the repository root:

```powershell
Set-Location .\backend
# Only needed if the virtual environment does not exist:
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# Use the existing local SQLite database:
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Docs: http://127.0.0.1:8000/docs

In a second PowerShell window:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/health/db
```

`/health` remains a simple liveness check. `/health/db` runs `SELECT 1` and
returns HTTP 200 when connected, or HTTP 503 with `Database unavailable`.
It does not return database URLs, credentials, or raw database errors.

## Database configuration

The backend reads `DATABASE_URL` from the process environment. `.env.example`
is a reference, not an automatically loaded configuration file.
Missing, empty, or whitespace-only values use the existing absolute path
`backend/nagriksetu.db`, regardless of the working directory.

Expected PostgreSQL URL:

```text
postgresql+pg8000://USER:URL_ENCODED_PASSWORD@HOST:PORT/DATABASE
```

`postgresql://` and `postgres://` are also normalized to pg8000. Use the database
connection credentials and host/port from Supabase, not its HTTPS project API URL
or API key. Percent-encode special characters in usernames/passwords (for example,
`@` becomes `%40`). Use the port supplied by your connection settings.

To enter a URL without putting it into PowerShell command history:

```powershell
$databaseInput = Read-Host 'Database connection URL' -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', $databaseInput).Password
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

PostgreSQL connections use verified TLS by default and a 10-second driver timeout.
`?sslmode=verify-full` and `?sslmode=require` both enable certificate and hostname
verification here. For a local PostgreSQL server without TLS, append
`?sslmode=disable`. Other sslmode values are rejected. If your server requires a
custom trusted CA, configure Python's `SSL_CERT_FILE` environment variable.

Switching the URL selects a different database; it does not migrate SQLite data.
Existing automatic table creation remains in place at startup. A configured but
unreachable PostgreSQL database fails startup; it does not silently fall back to
SQLite. SQLite fallback applies only when the URL is missing or blank.

JWT values are placeholders for future work. No authentication is implemented.
