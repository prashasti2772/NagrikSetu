# NagrikSetu operations runbook

Run commands below from `backend/` with its virtual environment active. Production
secrets belong in the hosting provider's environment/secret settings; never in Git,
command arguments, screenshots, support messages, or frontend variables. Local
`backend/.env` is ignored. Public support contact: **nagriksetuprashasti@gmail.com**.

## Where application data lives

SQLite (`backend/nagriksetu.db`) remains the development database. Production targets
Supabase PostgreSQL through the **process environment** `DATABASE_URL`. Missing or
blank `DATABASE_URL` selects SQLite; a configured but inaccessible database fails
startup rather than silently switching databases. Storage credentials do not select
the SQL database. Changing the URL does not transfer development data.

In the production Supabase project, use **Table Editor** (database tables), **SQL
Editor** for reviewed queries, and the application's authenticated Admin APIs for
supported account/department operations. Prefer the application workflow APIs for
assignments, status changes and citizen verification so audit history is recorded.
See [Supabase table management](https://supabase.com/docs/guides/database/tables).

| Data | Existing persistence and management |
| --- | --- |
| Citizens, profiles, staff and admins | `users`: profile fields, password hashes, role, department, activation and safe trust metadata. Officers are authority users; no separate officer/profile database is needed. |
| Reference departments | `departments`; view/manage through department Admin APIs. Reference departments are seeded idempotently at initialization. |
| Every citizen submission | `complaints`, including owner, optional location, individual verification state and `incident_id`. Consolidation preserves each report. |
| Shared civic issue | `incidents`: shared assignment, progress and resolution. Staff confirm consolidation through scoped incident APIs. |
| Assignment and timeline audit | Current assignments on reports/incidents; `complaint_status_history` records actors, transitions, assignment snapshots and verification feedback. `complaint_remarks` stores staff remarks. |
| Resolution review policy | `incident_verification_rounds`: saved window/quorum, deadlines, outcome and review reason. Citizen decisions remain attached to reports and their timelines. |
| Evidence | `complaint_evidence` contains metadata; private image bytes live in Storage. Multiple linked reports can reference the same resolution object. |
| Notifications | `notifications`, scoped to the recipient. |
| Recovery and email verification | `password_otps`: purpose-specific hashes, expiry and attempt state. Never export codes, hashes or reset material to support tools. |
| Intelligence and analytics | `complaint_suggestions` stores advisory suggestions; dashboards/analytics aggregate existing records. |

Access to production tables is an operator privilege. The app uses its own JWT
authorization, not browser-side Supabase Auth policies. Before storing production
data, disable unnecessary Supabase Data API exposure or review grants and enable
deny-by-default RLS for application tables; confirm an unprivileged client cannot
bypass the backend. Do not add public read/write policies to make the UI work.
Frontend traffic should use the documented NagrikSetu APIs.

Review pending verification through scoped complaint/incident APIs. The prototype
defaults to a 72-hour window and 60% approval quorum, saved per resolution round;
these are application settings, not government policy. After a window expires,
an authorized officer can call
`POST /api/v1/authority/incidents/{incident_id}/finalize-verification` with a JSON
body containing `reason`. Resolution notes and evidence must already be recorded. Closure is
an explicit staff action, not a scheduled job or a claim that silent reporters
approved. Individual responses and rejection/reopen history remain preserved.

## Database releases and recovery

1. Confirm the target project and a nonblank process `DATABASE_URL` privately.
   Use the pg8000 PostgreSQL connection URL from the project's connection settings.
   Retain certificate/hostname verification; a provider CA belongs in
   `SSL_CERT_FILE` when required. Never use an unverified SSL context.
2. Take a recoverable database backup and inspect the migration diff before a
   production upgrade. Keep backups outside Git and restrict operator access.
3. Run a safe connectivity diagnostic: `python -m app.db.diagnose`. It prints
   classified results rather than the connection string.
4. Apply reviewed migrations/reference initialization once, before scaling up:

   ```sh
   python -c "from app.db.database import engine; from app.db.initialize import initialize_database; initialize_database(engine); engine.dispose()"
   ```

   Startup also invokes the same idempotent initializer. Avoid concurrent startup
   migration attempts. SQLite migrations use the existing initializer's foreign-key
   handling; preserve the local database and verify backups before changing it.
5. Check `/health/ready`; production should report `database.provider` as
   `postgresql` and `connected` as `true`. Exercise an authorized workflow in a
   staging environment before directing real traffic to a new deployment.

If `DATABASE_URL` is missing, production Supabase Postgres has not been live-verified.
The exact remaining requirement is a valid process-environment `DATABASE_URL` and a
successful verified connection/migration check. Do not infer SQL connectivity from
a successful Supabase Storage test.

Restore a backup into an isolated target first and verify migrations, row counts,
foreign keys and representative workflows. An application rollback does not reverse
a migration; do not blindly downgrade or delete production tables. Supabase database
backups do not include Storage object bytes, so plan and rehearse evidence recovery
separately. [Supabase backup scope](https://supabase.com/docs/guides/database/overview)

## Evidence and image operations

Manage files in **Supabase Dashboard → Storage → complaint-evidence**. Keep this
bucket private, with allowed MIME types `image/jpeg`, `image/png`, `image/webp`
and a 10 MB default application limit (`EVIDENCE_MAX_BYTES=10485760`). Align the
bucket's size limit with the application setting. The backend validates MIME,
signature and size, selects random object names, and persists evidence metadata.
Private buckets require authorized access or temporary signed URLs.
[Supabase bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals)

Set `SUPABASE_URL` to the project base URL, `SUPABASE_SECRET_KEY` only on the backend,
and `SUPABASE_STORAGE_BUCKET=complaint-evidence`. Do not use a database connection
string or a dashboard page URL as `SUPABASE_URL`. Never expose the secret/service
role key in a `VITE_` variable. Obtain a 300-second signed URL through the authorized
evidence access endpoint; do not store it as a permanent public image URL.

The explicit operator check uses one generated non-personal PNG and then removes it:

```sh
python -m app.smoke storage --live
```

The result reports upload, private bucket, signed access, download, validation,
deletion and cleanup checks without printing credentials or signed URLs. If cleanup
fails, use only the exact generated temporary path reported by the command to locate
the leftover test object. Do not delete an entire report folder. For real evidence,
check **all** `complaint_evidence` references before removing an object: consolidated
reports may share one private file. Keep metadata/object retention coordinated;
ordinary application APIs intentionally do not provide unrestricted file deletion.

## Authentication email and public help

Security messages use **Brevo REST**, configured by `BREVO_API_KEY`,
`BREVO_SENDER_EMAIL` and optional `BREVO_SENDER_NAME`. Configure and verify the
sender/domain in Brevo, then inspect transactional delivery logs for acceptance,
bounces or rejection. Provider acceptance is not proof of inbox delivery.
[Brevo sender setup](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email),
[transactional logs](https://help.brevo.com/hc/en-us/articles/360021533839-Manage-your-transactional-logs-and-email-previews)

Registration verification and password recovery have separate OTP purposes. The
default expiry is 10 minutes (`OTP_EXPIRE_MINUTES`), with one-use verification,
attempt limits, issuance cooldowns and endpoint rate limits. The backend never logs
OTPs or API keys. Delivery failure produces a safe error for recovery/verification;
registration can remain successful and email verification can be retried. Production
does not silently use the development no-op email provider.

For one explicitly authorized test email, privately configure `BREVO_TEST_RECIPIENT`
and run:

```sh
python -m app.smoke email --live
```

Without a configured recipient the command sends nothing. The message contains a
demonstration code, not an account-verification token persisted by the application.
Automated tests use fakes and must never send real messages. Restrict access to Brevo
logs/previews because the provider handles recipient information and message content.

**Public Help & Support: nagriksetuprashasti@gmail.com.** This mailbox is for user
support, separate from authentication OTP delivery and sender configuration. Do not
ask users to email passwords, OTPs, API keys, Aadhaar data or identity documents.

## Deployment and monitoring

For Render or an equivalent Python web service, use repository root directory
`backend`, install `requirements.txt`, and run the ASGI application. Render's
documented service command pattern uses its assigned port:
[Render FastAPI deployment](https://render.com/docs/deploy-fastapi).

```sh
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

Set `APP_ENV=production`, a persistent random `JWT_SECRET` of at least 32 characters,
the verified production `DATABASE_URL`, and explicit frontend `CORS_ORIGINS` in the
service environment. Optional integration settings may load from ignored local
`.env` during development; deployment should set them directly. Database/JWT settings
are process-environment only. Never deploy the local SQLite file or `.env` with code.

Use the hosting dashboard for environment variables, restricted service logs,
deployment history and the deployed commit identifier. Redeploy/restart after
configuration changes. Keep request-body/debug logging disabled; avoid collecting
bearer tokens, coordinates, images, signed URLs or user-submitted personal data in
monitoring. Prototype limits and caches are per process; arrange shared protection
and reviewed migration coordination before scaling to multiple workers.

| Endpoint | Meaning |
| --- | --- |
| `GET /health` | API liveness only. |
| `GET /health/db` | Executes `SELECT 1`; 200 connected or 503 unavailable, with no URL/raw error. |
| `GET /health/ready` | Database provider and connectivity, 200/503. Use this for DB-dependent service readiness. |
| `GET /health/integrations` | Optional Gemini/Storage/email configuration status and BHASHINI pending state. No live provider calls, URLs, keys, sender identities or bucket names. |

`configured` means settings are present (and Storage's local configuration passes
its adapter validation). It does **not** prove DNS, credential validity, quota,
provider health, delivery or bucket access. Missing optional services do not change
the database readiness response. Use the controlled smoke commands when appropriate.

## Admin and staff bootstrap

Run the existing operator CLI in a trusted environment configured for the intended
database. Substitute operator-controlled values locally; passwords are prompted
twice and are never command arguments:

```sh
python -m app.create_staff --role admin --email "<operator-email>" --full-name "<operator-name>"
python -m app.create_staff --role authority --department-id "<active-department-id>" --email "<official-staff-email>" --full-name "<staff-name>"
```

The CLI applies initialization, rejects an existing account and requires an active
department for authority users. Use admin APIs afterward for supported staff account
creation, department changes and activation/deactivation. Citizen signup always
creates a citizen and cannot select privileged roles. Public support email is not
automatically an administrator or an OTP sender.

If `STAFF_REQUIRE_VERIFIED_EMAIL=true`, ensure Brevo works and have each staff account
log in, request email verification and verify its own code before protected staff
operations. The email-setup routes remain available to complete that process. Do not
set email/identity flags manually to bypass the workflow. `app.seed_dev` and demo
identity are development-only; do not use demo accounts as production staff.

BHASHINI and DigiLocker still require external approval and reviewed integrations;
the current abstractions remain disabled. Aadhaar data/documents are not accepted.
Optional Gemini failure retains local assistance. Real datasets/models and frontend
integration are separate work: use the existing API contract, frontend handoff and
ML documentation rather than inventing provider credentials or training claims.
