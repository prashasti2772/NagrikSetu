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

## Authentication and recovery

Registration accepts JSON `full_name`, `email`, `password` (10-128 characters),
and optional `phone`. It always creates citizens; additional fields, including
`role`, are rejected. Login accepts JSON `email` and `password` and returns an
`access_token`. Send `Authorization: Bearer <access_token>` for protected routes.
Passwords use Argon2. Email addresses are normalized to lowercase.

Set a persistent random `JWT_SECRET` of at least 32 characters for deployment.
`APP_ENV=production` rejects missing/short secrets and disables console OTP delivery.
Development without a configured secret generates a process-local key: restarting
invalidates tokens, and multiple workers require a shared configured secret.
`JWT_ALGORITHM` supports HS256 (default), HS384 and HS512.

Recovery: POST `auth/forgot-password` with `email`, then `auth/verify-otp` with
`email` and `otp`, then `auth/reset-password` with the returned `reset_token` and
`new_password`. All paths use `/api/v1/`. Codes are hashed, expire after
`OTP_EXPIRE_MINUTES`, allow five attempts, and can only be verified once. Issuance
has a 60-second per-account cooldown. Reset tokens are single-use and expire with
the OTP. Password resets invalidate existing access tokens. Development delivery
logs the code to the terminal only; API responses never contain OTPs. Replace
`get_otp_delivery` with a Brevo adapter for deployed email; the Brevo environment
variables are placeholders and no external email is sent yet. Use a shared ingress
rate limiter for deployment-wide login and recovery abuse protection.

## Workflow and permissions

- `/api/v1/auth/register`, `/login`, `/me`, `/forgot-password`, `/verify-otp`, `/reset-password`
  (all suffixes in this line are under `/api/v1/auth`).
- GET `/api/v1/departments`; admin POST `/api/v1/admin/departments` and PATCH `/{id}`.
- GET `/api/v1/users/me/complaints` and `/api/v1/users/me/dashboard`.
- GET `/api/v1/authority/dashboard`, `/complaints`, `/complaints/{id}` (under the authority prefix).
- PATCH authority complaint `/{id}/assign`, `/{id}/status`; POST `/{id}/remarks`,
  `/{id}/resolve`, `/{id}/reopen` under `/api/v1/authority/complaints`.
- POST `/api/v1/complaints/{id}/verify`; GET `/{id}/timeline` under the complaints prefix.

Authorities can access their department's complaints or explicit officer assignments.
Admins access all complaints and perform initial routing and department transfers.
Assignment accepts department/officer IDs and priority; the officer must belong to
that department. Authority listing supports category, priority, status, department
ID, location substring and assigned_officer ID, plus offset/limit pagination.
Dashboards return individual status counts and total; citizen dashboard also includes
`submitted_under_review`; authority dashboard includes up to ten recent complaints.

Resolve accepts `resolution_notes` and optional HTTP(S) `evidence_url` and sets
`verification_pending`. Only the owning citizen can verify with `resolved` and
optional `feedback`: acceptance sets `resolved`/`approved`, rejection sets
`reopened`/`reopened`. Status changes, assignment, remarks and verification persist
in the timeline. Direct status updates cannot bypass verification.

Public complaint creation/list/detail remain available for compatibility. Authenticated
creation attaches the citizen owner. Anonymous reports remain ownerless and cannot
be citizen-verified. The legacy PATCH complaint status endpoint now requires scoped
authority/admin access. Public complaint responses continue to expose complaint
information; assess redaction before a public production deployment.

Provision staff through the local operator CLI (password is prompted, never an argument):

```powershell
.\.venv\Scripts\python.exe -m app.create_staff --email admin@example.com --full-name "Local Admin" --role admin
.\.venv\Scripts\python.exe -m app.create_staff --email officer@example.com --full-name "Local Officer" --role authority --department-id 1
```

No default admin or authority accounts are created. Tests create staff only inside
an isolated temporary database.

## Schema upgrades and checks

Startup creates new tables, adds missing complaint columns without deleting existing
rows, backfills priority from severity, and seeds eleven departments idempotently.
Run the initial upgrade with a single process before starting multiple workers.
This additive upgrade supports the original schema; use versioned migrations for
future schema changes. Existing string `assigned_department` values are preserved;
an admin assigns the corresponding department IDs to route legacy complaints.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Tests use temporary SQLite databases and cover authentication, recovery, permissions,
complaint workflows/history, health endpoints and preservation of legacy data.
PostgreSQL URL/driver construction is checked without requiring credentials;
live Supabase connectivity needs an externally configured `DATABASE_URL`.
