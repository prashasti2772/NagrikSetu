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
variables are placeholders and no external email is sent yet. The prototype includes per-process limits; use a shared ingress
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

Startup runs Alembic upgrades to `head`, then seeds eleven departments idempotently.
Revision `0001_phase2` freezes the original Phase 2 schema and safely adopts existing
Phase 2 tables. It also adds the known missing Phase 1 complaint columns and preserves
all existing rows. Revision `0002_phase3` adds notifications, evidence metadata and
separate complaint suggestions. No migration imports mutable application models.
Run schema upgrades once before starting multiple application workers. Existing string
`assigned_department` values remain intact; admins assign department IDs to route them.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Tests use temporary SQLite databases and cover authentication, recovery, permissions,
complaint workflows/history, health endpoints and preservation of legacy data.
PostgreSQL URL/driver construction is checked without requiring credentials;
live Supabase connectivity needs an externally configured `DATABASE_URL`.

## Alembic migration commands

Run from `backend`, with `DATABASE_URL` set in the process environment for PostgreSQL,
or unset for local SQLite. `.env` is not automatically loaded. No URL or password goes
in `alembic.ini`.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic history
.\.venv\Scripts\python.exe -m alembic check
```

Before upgrading an existing local SQLite installation, create a consistent backup
(the source must already exist; the timestamp prevents replacing prior backups):

```powershell
.\.venv\Scripts\python.exe -c "import sqlite3, datetime; source=sqlite3.connect('file:nagriksetu.db?mode=ro', uri=True); target=sqlite3.connect('nagriksetu-backup-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.db'); source.backup(target); target.close(); source.close()"
```

An unversioned Phase 2 installation uses the same `upgrade head` command: the baseline
inspects and adopts existing tables, rather than dropping them or blindly stamping.
Existing unexpected missing columns fail with a migration error. It does not rewrite
unknown legacy constraints/types. SQLite TIMESTAMP and DATETIME are compared as
equivalent to accommodate the earlier additive updater. Back up PostgreSQL with your database provider or
`pg_dump` before deployment migrations. Fresh databases are also fully supported.
Startup preserves local convenience by invoking the same upgrade, with reference data
seeded afterwards. `alembic upgrade` alone updates schema; app startup seeds departments.

For future schema work, edit the models, generate a revision, review it, then upgrade:

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe schema change"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Offline SQL for a **new** database can be generated with `alembic upgrade head --sql`.
Existing installations need online inspection for adoption. `alembic downgrade
0001_phase2` removes Phase 3 tables and their data; use only on disposable databases
or with a recovery plan. Do not downgrade an existing installation merely to initialize
migrations. Tests validate fresh creation, Phase 1/2 adoption, idempotence, schema
agreement with models, a disposable downgrade/upgrade, and PostgreSQL SQL generation.
Live PostgreSQL/Supabase execution still needs a configured database connection.

## Phase 3 endpoints and contracts

All paths below start with `/api/v1`:

| Method | Path | Access / purpose |
| --- | --- | --- |
| GET | `/admin/users`, `/admin/users/{id}` | Admin user listing/detail |
| POST | `/admin/authorities` | Admin creates an authority with a hashed temporary password |
| PATCH | `/admin/users/{id}` | Admin edits department_id, designation, is_active only |
| GET | `/admin/officers` | Admin workload and availability |
| GET | `/authority/analytics/summary` | Scoped status counts and average resolution hours |
| GET | `/authority/analytics/categories` | Scoped category counts |
| GET | `/authority/analytics/departments` | Scoped department counts, including unassigned |
| GET | `/authority/analytics/trends` | Scoped daily complaint creation counts |
| GET | `/notifications` | Own notifications, optionally filtered by is_read |
| PATCH | `/notifications/{id}/read`, `/notifications/read-all` | Mark own notifications read |
| POST | `/intelligence/analyze-complaint` | Authenticated, local text suggestions |
| GET | `/authority/complaints/{id}/duplicates` | Scoped staff duplicate candidates |
| GET, POST | `/complaints/{id}/evidence` | Owner/scoped staff evidence metadata |

User filters: `role`, `department` (ID), `is_active`, `search` (name/email/employee ID).
User/officer/notification lists use `offset` and `limit` (maximum 100). Officer listing
supports `department` and `is_active`. Creation accepts full_name, email, employee_id,
designation, department_id and temporary_password; extra role/password-hash fields are
rejected. There is no automatic email delivery or forced first-login password change;
the existing password-recovery flow can set a replacement password. Staff changes
invalidate prior tokens when deactivating or moving departments. Active assignments,
including verification-pending reports, must be reassigned before an officer is moved
or deactivated. Current workload uses the complaint's current assigned officer and
current status, not historical attribution. `current_status` is inactive, busy, or
available, based on account state and active assignment count.

Analytics accepts inclusive UTC creation-date filters `date_from` / `date_to`
(`YYYY-MM-DD`). Every query follows the existing authority department/officer scope.
Average resolution hours include only currently citizen-confirmed `resolved` reports
with valid created_at/resolved_at values; the duration ends when staff submitted the
resolution, excluding the citizen's confirmation delay. Missing samples return null
and `resolution_sample_count=0`. Trends return observed dates, with no invented rows.

Notifications are committed atomically with complaint submission, assignment, status
change, resolution submission, verification request and reopening. Inactive accounts
cannot log in to retrieve them. There is no external push/email transport.

Evidence is URL metadata only: image_url, evidence_type (`report`, `resolution`,
`supporting`), uploaded_at (server UTC), uploaded_by (authenticated user or null for
anonymous creation). Existing complaint image and resolution URLs are recorded on new
submissions/resolutions. Old URLs remain preserved on complaints; historical uploader
and upload timestamps are not invented. No URL is fetched, and no binary file is stored.
Cloudinary or Supabase Storage can later supply URLs via a storage adapter.

## Local complaint intelligence

No paid service, API key, model download or network call is used. scikit-learn fits
TF-IDF vectors to the synthetic examples in `data/category_examples.json`. Category
centroid cosine similarity supplies a suggestion, supporting keywords and an uncalibrated
confidence score. This is an English prototype with no claimed production accuracy.
Priority is a transparent ordered phrase heuristic: critical, high, low signals,
otherwise medium. It does not guarantee emergency detection or understand negation.

Analysis accepts title, description and optional latitude/longitude; coordinates are
validated and reserved for future geographic scoring. Response fields include
suggested_category, confidence, category_keywords, suggested_priority, priority_signals,
recommended_department (ID/name or null), possible_duplicates (IDs/similarity),
model_version and limitations. For analysis, department follows the predicted category.
On creation, suggestions are stored separately in `complaint_suggestions`; department
recommendation follows the user-selected category. User category, severity, priority,
assignment and workflow are never overwritten by intelligence.

Duplicates use TF-IDF/cosine against at most `DUPLICATE_CANDIDATE_LIMIT` recent scoped
reports within `DUPLICATE_LOOKBACK_DAYS`, filtered by `DUPLICATE_THRESHOLD`; at most ten
matches are returned. Citizens compare only their own complaints. Authorities compare
permitted complaints, and admins can compare all. The source complaint is excluded from
its duplicate list. No automatic merge/delete occurs. Corpus/version details and
limitations are documented in `data/README.md`.

## Prototype request limits

The Python standard-library sliding-window limiter is thread-safe and bounded to
10,000 active peer/endpoint keys. Defaults per 60 seconds: login 10, registration 5,
forgot-password 5, OTP verification 10, reset-password 10, intelligence 20. Configure
limits through `.env.example` variables in the process environment. Rejected requests
return 429 plus Retry-After; expired windows recover automatically. Counts are per
endpoint and direct peer IP, including failed requests. Raw forwarding headers are
ignored; only configure Uvicorn proxy trust for an actual trusted proxy.

Counters reset on restart and are independent across workers/instances. This is a
single-process prototype limiter, not deployment-wide abuse protection; use a shared
free gateway/limiter when scaling. Redis is not required. Tests clear only in-memory
limiter state between isolated cases.
