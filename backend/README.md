# NagrikSetu backend

Backend for citizen civic issue reporting, intelligent routing, transparent
tracking, and community-verified resolution. Local text suggestions and a local
help chatbot support the workflow; users and staff make the decisions.

SQLite remains the working development database. PostgreSQL URL construction,
verified pg8000 TLS configuration, and offline migration SQL are tested; a live
production connection has not been verified in this pass because no process
DATABASE_URL is configured. Live production PostgreSQL verification requires DATABASE_URL.
Storage uses a separate HTTPS project URL/key and does not change the SQL database.

The complete [frontend API contract](API_CONTRACT.md) includes authentication,
roles, concrete request examples, response shapes, errors, and all frontend routes.
The [frontend handoff](FRONTEND_HANDOFF.md) provides the React setup checklist.
Use `VITE_API_BASE_URL=http://127.0.0.1:8000` with its full `/api/v1/...` paths.
Backend `CORS_ORIGINS` remains configurable and defaults to both
`http://localhost:5173` and `http://127.0.0.1:5173`.

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
is a reference, not automatically loaded. Optional Gemini, Brevo, private
Storage, and verification-window/quorum settings are read from `backend/.env`; process environment values take
precedence. SQL database and JWT settings remain process-environment only.
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

PostgreSQL connections use verified TLS with certifi plus system/Windows trusted
roots by default and a
10-second driver timeout. The verified SSLContext is passed to pg8000 through
SQLAlchemy connect_args; certificate and hostname verification remain enabled.
`?sslmode=verify-full` and `?sslmode=require` both enable certificate and hostname
verification here. For a local PostgreSQL server without TLS, append
`?sslmode=disable`. Other sslmode values are rejected. If your server requires a
custom trusted CA, set `SSL_CERT_FILE` to its PEM certificate file. That CA is
loaded in addition to certifi and system roots, without disabling verification. Obtain
the CA from the database provider or your trusted network administrator; certifi
alone cannot validate a private/self-signed CA that is absent from its bundle.

For Supabase's private database CA, open the project's **Database Settings > SSL
Configuration > Download certificate**. Save that CA locally and set its path in the
same PowerShell terminal that starts the backend:

```powershell
$env:SSL_CERT_FILE = (Resolve-Path -LiteralPath (Read-Host 'Downloaded Supabase CA certificate path')).Path
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Keep the existing `DATABASE_URL` in that terminal. Downloading a certificate without
setting `SSL_CERT_FILE` does not add it to the backend's trust store. Restart the
backend after changing the CA setting. Never download/trust a certificate from an
unverified failing TLS connection. See [Supabase's verified TLS instructions](https://supabase.com/docs/guides/platform/ssl-enforcement).

Switching the URL selects a different database; it does not migrate SQLite data.
Startup applies Alembic migrations and seeds reference departments in the selected
database. A configured but unreachable PostgreSQL database fails startup; it does
not silently fall back to SQLite. SQLite fallback applies only when the URL is
missing or blank.

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
has a 60-second per-email/purpose cooldown. Reset tokens are single-use and expire
with the OTP. Password resets invalidate existing access tokens. When configured,
registration, forgot-password, and email verification use the Brevo REST adapter
over verified TLS. Without Brevo in development, no message is sent and no OTP is
logged; API responses never contain OTPs. Citizen email verification is advisory
and never blocks reporting. Staff can optionally be required to verify their email
before accessing protected work APIs (see closing-pass configuration below). The prototype includes per-process limits; use a shared
ingress rate limiter for deployment-wide login and recovery abuse protection.

## Workflow and permissions

- `/api/v1/auth/register`, `/login`, `/me`, `/forgot-password`, `/verify-otp`, `/reset-password`
  (all suffixes in this line are under `/api/v1/auth`).
- `PATCH /api/v1/auth/me` updates only the current user's full name and phone.
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
`reopened`/`rejected`. Status changes, assignment, remarks and verification persist
in the timeline, including the actor, action, feedback, time, verification state,
and old/new department and officer IDs. Direct status updates cannot bypass verification.
The verification queue uses `/api/v1/authority/complaints?status=verification_pending`.

Complaint creation requires a citizen login and attaches the authenticated owner.
Listing and detail require authentication: citizens see their own reports, authorities
see department/officer-scoped reports, and admins see all. Legacy anonymous reports
remain preserved and cannot be citizen-verified. The compatibility PATCH complaint
status endpoint requires scoped authority/admin access.

Every citizen report is independently retained and starts in its own incident.
Possible same-issue candidates use local text/category similarity, recency, and
Haversine distance where both coordinate pairs are available. Candidates are
explanatory suggestions; only scoped staff can explicitly confirm consolidation.
Linking never deletes reports or their histories. Shared incident updates propagate
to linked reports. Resolution uses the explicit window/quorum policy below; a valid
rejection reopens the shared incident. Location is optional; coordinates must be
provided as a pair, and `location_text` is accepted as an address alias. Optional
`location_accuracy_m`, `locality`, `area`, and `ward` are persisted.

Provision staff through the local operator CLI (password is prompted, never an argument):

```powershell
.\.venv\Scripts\python.exe -m app.create_staff --email admin@example.com --full-name "Local Admin" --role admin
.\.venv\Scripts\python.exe -m app.create_staff --email officer@example.com --full-name "Local Officer" --role authority --department-id 1
```

No default admin or authority accounts are created at startup. To explicitly add
local demonstration accounts and three clearly labeled sample reports:

```powershell
$env:APP_ENV = 'development'
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
.\.venv\Scripts\python.exe -m app.seed_dev --yes
```

The command prompts for a 10-128 character password and confirmation without echo.
An optional process variable `SEED_DEMO_PASSWORD` can supply it for automation; never
commit it. The script refuses non-development environments and PostgreSQL. It creates
`demo.admin@example.com`, `demo.citizen@example.com`, and authority accounts
`demo.roads@example.com`, `demo.sanitation@example.com`, `demo.water@example.com`.
All new accounts use the supplied password. Re-running preserves existing passwords
and sample progress; conflicting reserved identities cause an error without replacement.
Sample reports are assigned to the corresponding officers with persisted timelines,
suggestions and notifications. Tests seed only temporary SQLite databases.

## Schema upgrades and checks

Startup runs Alembic upgrades to `head`, then seeds eleven departments idempotently.
Revision `0001_phase2` freezes the original Phase 2 schema and safely adopts existing
Phase 2 tables. It also adds the known missing Phase 1 complaint columns and preserves
all existing rows. Revision `0002_phase3` adds notifications, evidence metadata and
separate complaint suggestions. No migration imports mutable application models.
Revision `0003_workflow_audit` extends the existing timeline with action,
verification state and assignment history fields, and adds complaint query indexes.
Existing history is retained with action `legacy`; missing historical assignments
are not invented. SQLite connections enable foreign key enforcement.
Revision `0004_integrations` adds optional location fields, one incident per existing
complaint (preserving IDs and workflow values), purpose-scoped OTP/email verification,
and private evidence-object metadata. SQLite migration FK checks run before enforcement
is restored.
Revision `0005_verification_policy` stores resolution-round windows, quorum snapshots,
closure/reopen outcomes and staff review reasons without deleting prior history.
Revision `0006_identity` adds safe optional trust metadata to users; no identity
numbers or raw documents are stored.
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
| GET | `/authority/analytics/priorities`, `/authority/analytics/recent` | Priority counts and recent persisted reports |
| GET | `/authority/analytics/trends` | Scoped daily complaint creation counts |
| GET | `/notifications` | Own notifications, optionally filtered by is_read |
| PATCH | `/notifications/{id}/read`, `/notifications/read-all` | Mark own notifications read |
| POST | `/intelligence/analyze-complaint` | Authenticated, local text suggestions |
| GET | `/authority/complaints/{id}/duplicates` | Scoped staff duplicate candidates |
| GET, POST | `/complaints/{id}/evidence` | Owner/scoped staff evidence metadata |
| POST | `/chatbot/message` | Public help; authenticated and scoped complaint status |

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
Average resolution hours include currently `resolved` reports with valid
created_at/resolved_at values, including quorum/staff-review closures; the duration
ends when staff submitted the resolution, excluding review delay. This metric does
not imply every reporter approved; use verification state and incident outcome. Missing samples return null
and `resolution_sample_count=0`. Trends return observed dates, with no invented rows.

Notifications are committed atomically with complaint submission, assignment, status
change, resolution submission, verification request and reopening. Inactive accounts
cannot log in to retrieve them. There is no external push/email transport.

Evidence may be an existing HTTP(S) URL or an uploaded private object. Uploads accept
JPEG/PNG/WebP, default to 10 MiB (`EVIDENCE_MAX_BYTES`), ignore client filenames, and
use randomized object names in a private Supabase Storage bucket. Access links expire
after five minutes and are issued only after complaint-scope checks. Without storage
credentials startup remains normal and upload returns 503; URL evidence/reporting
remain usable. No URL is fetched and uploaded objects are never public.

Optional `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` configure
Storage only; they do not select or migrate the SQL database. Optional
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` enable transactional
email using REST, not SMTP. Gemini remains optional. BHASHINI capability discovery
and text-preserving fallback remain disabled pending approval; no provider endpoints
or credentials are assumed.

## Local complaint intelligence

The category classifier and priority rules use local pure-Python code and the supplied
examples. Optional Gemini chatbot/image assistance uses `GEMINI_API_KEY` only when
configured; local FAQ, text suggestions, and fallback behavior require no API key.
TF-IDF category centroid cosine similarity supplies a suggestion, supporting keywords,
and an uncalibrated confidence score. This is an English prototype with no claimed
production accuracy.
Priority is a transparent ordered phrase heuristic: critical, high, low signals,
otherwise medium. It does not guarantee emergency detection or understand negation.

Analysis accepts title, description and optional category, address, latitude/longitude.
Coordinates are validated; complete pairs support geographic duplicate filtering.
Response fields include suggested_category, confidence, category_keywords,
confidence_method, suggested_priority, priority_signals, priority_reason,
suggested_department (ID/name or null; recommended_department is a compatibility alias),
possible_duplicates (IDs/similarity/reason), duplicate_similarity_method, model_version
and limitations. Department follows a supplied category, or the inferred category.
On creation, suggestions are stored separately in `complaint_suggestions`; department
recommendation follows the user-selected category. User category, severity, priority,
assignment and workflow are never overwritten by intelligence.

Duplicates use TF-IDF/cosine against at most `DUPLICATE_CANDIDATE_LIMIT` recent scoped
reports within `DUPLICATE_LOOKBACK_DAYS`, filtered by `DUPLICATE_THRESHOLD`; at most ten
matches are returned. Category/address disagreements reduce scores; complete coordinate
pairs over 2 km apart are excluded. Missing coordinates do not imply zero distance.
Citizens compare only their own complaints. Authorities compare
permitted complaints, and admins can compare all. The source complaint is excluded from
its duplicate list. No automatic merge/delete occurs. Corpus/version details and
limitations are documented in `data/README.md`.

## Local Help & Support chatbot

`POST /api/v1/chatbot/message` uses local rules and `data/support_knowledge.json`
for reporting, tracking, categories, verification, reopening, assignment and account
help. Public FAQ answers need no login. Complaint-specific answers require a bearer
token and an explicit complaint ID, and follow the same owner/staff scope as the API.
Missing and unauthorized complaints both return 404. Responses contain an answer,
topic, suggested prompts and an optional minimal complaint status snapshot.
The chatbot never changes records. Complaint lookups remain local; optional Gemini
receives sanitized draft/help text and validated submitted images, with local fallback.

## Prototype request limits

The Python standard-library sliding-window limiter is thread-safe and bounded to
10,000 active peer/endpoint keys. Defaults per 60 seconds: login 10, registration 5,
forgot-password 5, OTP verification 10, reset-password 10, intelligence 20, chatbot 20.
Chatbot and intelligence have separate counters sharing the same configurable limit. Configure
limits through `.env.example` variables in the process environment. Rejected requests
return 429 plus Retry-After; expired windows recover automatically. Counts are per
endpoint and direct peer IP, including failed requests. Raw forwarding headers are
ignored; only configure Uvicorn proxy trust for an actual trusted proxy.

Counters reset on restart and are independent across workers/instances. This is a
single-process prototype limiter, not deployment-wide abuse protection; use a shared
free gateway/limiter when scaling. Redis is not required. Tests clear only in-memory
limiter state between isolated cases.

## Closing-pass workflow and optional integrations

**Working now:** SQLite persistence/migrations, role-scoped complaint and incident
workflows, notifications/history, local intelligence/fallback, optional trust metadata,
and provider-safe readiness at `GET /health/ready`. That endpoint returns
`{"status":"ok","database":{"provider":"sqlite","connected":true}}` or 503 when
unavailable, without database URLs or exception details.

**Optional:** private Supabase Storage, Brevo REST, Gemini and reverse geocoding need
local operator configuration; all preserve the core text reporting workflow when
unavailable. PostgreSQL remains the production target through process DATABASE_URL.
No production data was migrated in this pass.

**Pending external approval/implementation:** DigiLocker requester integration,
trusted Aadhaar offline signature/QR validation, and BHASHINI network services.
They are disabled; no endpoint or credential is invented. BHASHINI capability
discovery includes ASR/NMT/TTS/OCR, audio/text language detection, transliteration,
punctuation and voice preprocessing, all unavailable.

**Next ML training phase:** [ml/README.md](ml/README.md) documents reviewed dataset
ingestion, schema validation, conservative offline deduplication, deterministic
group/pair-aware splits, TF-IDF baseline training/evaluation and versioned metrics.
Only synthetic fixtures have been exercised. No production model, official dataset
or performance score is claimed; the running API retains its existing local rules.

### Verification window and quorum

Each resolution starts a persisted round with defaults
`VERIFICATION_WINDOW_HOURS=72` and `VERIFICATION_QUORUM_PERCENT=60`.
The required count is `max(1, ceil(distinct active citizen reporters * percent / 100))`;
the count, settings and deadline are snapshotted. One citizen gets one decision per
round, regardless of how many reports they filed. All reports and historical votes
remain preserved. Quorum closes the shared incident; silent reporters retain
`pending` verification status. A nonresponding citizen can still reject before the
original deadline, including after quorum closure.

After expiry, nothing closes automatically. Scoped staff can call
`POST /api/v1/authority/incidents/{incident_id}/finalize-verification` with a reason,
but only with recorded resolution notes and resolution evidence. This records
staff review, never invented citizen approval. Owners can use
`POST /api/v1/complaints/{complaint_id}/reopen-request` with a reason after closure
or expiry. A new resolution starts another round while retaining the old audit.
These defaults are prototype application policy, not government policy.
The [API contract](API_CONTRACT.md#exact-prototype-verification-policy) specifies
the response fields, limits and exact transitions.

### Optional trust and staff email policy

Safe user metadata contains identity status/provider/verification time only.
`GET /api/v1/users/me/verification` derives email trust and reports provider readiness.
No Aadhaar numbers, biometrics or KYC documents are accepted or stored. Reporting
does not require identity verification. DigiLocker and Aadhaar offline classes
define an outcome boundary for future approved/trusted implementations; they do
not contact government services or validate documents today.

For an explicitly labelled local demo only, process `APP_ENV=development` plus
`ENABLE_DEMO_IDENTITY=true` enables `POST /api/v1/users/me/verification/demo`
with empty JSON. It records **Demo Verified Citizen**, with real
`identity_verified=false`; it cannot replace an actual verified outcome.

Public signup remains citizen-only. Admin/local-operator provisioning, active-account
checks and department/officer scope govern staff access. Optional process
`STAFF_REQUIRE_VERIFIED_EMAIL=true` requires staff to complete email OTP before
work APIs, while leaving profile and email-verification endpoints available.
An admin must independently approve the official identity/employment; email control
alone is not evidence of government authorization. The default is false for
compatibility with existing local accounts.

### Optional reverse geocoding

Authenticated `POST /api/v1/location/reverse` takes a coordinate pair and returns
editable address hints. Configure process `GEOCODER_URL` as the full HTTPS reverse
endpoint and `GEOCODER_USER_AGENT` as an identifying application/contact string.
No default external endpoint is used. Missing/invalid settings and failed lookups
return graceful unavailable results; complaint creation never invokes geocoding.

The Nominatim-compatible adapter has a five-second timeout, bounded response/cache,
one-hour positive cache, short failure cache, no redirects, and a per-process
one-inflight/one-request-per-second gate. Public Nominatim additionally requires
`GEOCODER_ALLOW_PUBLIC_NOMINATIM=true`, visible attribution, and compliance with its
[usage policy](https://operations.osmfoundation.org/policies/nominatim/).
Use one worker or an application-wide limiter with that public service; the local
gate does not coordinate multiple workers. Provider hints never establish ward
jurisdiction or override a user's location. Manual location remains supported.

### Controlled live smoke commands

Run from `backend`. Automated tests mock providers and never invoke these commands.
The Storage command creates a tiny nonpersonal PNG, validates MIME/signature/size,
checks the bucket is private, uploads with a random path, requests a five-minute
signed URL, downloads it, and deletes/lists its test object to confirm cleanup.
It never prints the signed URL, key or project URL. If deletion fails, it reports
only the generated test object's path so an operator can remove it.

```powershell
.\.venv\Scripts\python.exe -m app.smoke storage --live
```

The closing-pass live attempt detected configuration but failed DNS resolution of
the locally configured project host before upload. No object was created and
upload/sign/delete remain unverified against that project. Compare the ignored
`SUPABASE_URL` setting with the actual project URL, correct it locally, then rerun.
The safe diagnostic code is `dns_resolution_failed`; provider HTTP rejections
include only a status code. TLS verification is never bypassed.

Brevo uses `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` over REST,
never SMTP. Email-verification and password-reset OTPs are purpose-isolated, hashed,
expiring and rate-limited. Existing mocked tests cover delivery failure and recovery.
This pass found Brevo configuration but no explicit `BREVO_TEST_RECIPIENT`, so no
real email was sent. To explicitly send **one demo OTP email** to an address you control:

```powershell
$recipientInput = Read-Host 'Test recipient email you control' -AsSecureString
$env:BREVO_TEST_RECIPIENT = [System.Net.NetworkCredential]::new('', $recipientInput).Password
try {
    .\.venv\Scripts\python.exe -m app.smoke email --live
} finally {
    Remove-Item Env:BREVO_TEST_RECIPIENT -ErrorAction SilentlyContinue
}
```

The demo code is not persisted as an account recovery token and is never printed.
Provider acceptance is reported without recipient/code/key; check that mailbox
separately to confirm delivery. No email is sent at import, startup or in tests.

Live production PostgreSQL verification requires DATABASE_URL.
Set it securely in the process as documented above, then run
`python -m app.db.diagnose`; with provider backup/deployment approval, apply
`python -m alembic upgrade head`, start Uvicorn and check `/health/db` and
`/health/ready`. Offline SQL/model compatibility tests do not establish live
credentials, network access or production migration success.

### Closing-pass validation

The complete SQLite suite passed **136 tests, 0 failures** after the closing-pass
changes, preserving the original 95-test baseline. Coverage includes fresh and
legacy schema upgrades, model/schema agreement, disposable migration round trips,
PostgreSQL offline SQL/engine configuration, role restrictions, optional providers,
verification policy/audit preservation, and offline ML preparation. App import and
all 68 OpenAPI operation entries in API_CONTRACT.md were checked. Existing
`0004_integrations` Column.copy deprecation warnings remain non-fatal.
Live Storage and email/PostgreSQL limitations are reported above; mocked test
success is not a claim of live provider verification.
