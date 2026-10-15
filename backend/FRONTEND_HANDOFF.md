# NagrikSetu React handoff

NagrikSetu lets citizens report local issues, follow authority action, and verify
whether the reported problem was resolved. Local ML suggestions and the support
chatbot assist this workflow. The complete endpoint, request, response, and error
reference is [API_CONTRACT.md](API_CONTRACT.md).

## Start the backend with SQLite

Run in PowerShell from the repository root:

```powershell
Set-Location backend
if (-not (Test-Path .\.venv\Scripts\python.exe)) { py -3 -m venv .venv }
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:APP_ENV = "development"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Startup applies migrations and seeds reference departments. Without
`DATABASE_URL`, the backend uses `backend/nagriksetu.db`. Check
`http://127.0.0.1:8000/health/db`; success is
`{"status":"ok","database":"connected"}`. Swagger is at
`http://127.0.0.1:8000/docs`.

The backend reads process environment variables. Optional Gemini, Brevo, and
Supabase Storage settings may also be supplied through ignored `backend/.env`;
process environment values take precedence. SQL database and JWT settings are not
loaded from `.env`. Default CORS origins are `http://localhost:5173` and
`http://127.0.0.1:5173`. Set `CORS_ORIGINS` before starting the backend if your
frontend uses another origin. In development, an omitted `JWT_SECRET` generates
a temporary secret for each backend process, so sign in again after a restart or
reload. A stable secret can be configured in the backend environment only.

Supabase is not required for frontend development. Live production PostgreSQL
verification requires DATABASE_URL. Verified TLS remains enabled. Do not put database
URLs, database passwords, signing secrets, or CA certificates in frontend configuration.
`GET /health/ready` reports only the database provider and connectivity.

## Optional demo accounts

In another PowerShell terminal, use the same backend directory and SQLite
environment settings above, then run:

```powershell
.\.venv\Scripts\python.exe -m app.seed_dev --yes
```

The command securely prompts for a password of 10–128 characters and confirmation.
That password is used for newly created demo accounts; there is no built-in demo
password. Seeding requires development mode and SQLite, preserves existing
passwords and sample workflow changes, and creates three clearly marked sample
complaints with officer assignments.

| Login email | Role |
| --- | --- |
| `demo.admin@example.com` | admin |
| `demo.roads@example.com` | authority — Roads & Infrastructure |
| `demo.sanitation@example.com` | authority — Sanitation |
| `demo.water@example.com` | authority — Water Supply |
| `demo.citizen@example.com` | citizen |

## Connect React

Set the frontend's Vite environment variable, then restart its development server:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Use full API paths; the base URL has no `/api/v1` suffix. This minimal service
accepts the current access token as an argument and preserves HTTP error status:

```javascript
const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = new Headers();
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map(item => `${item.loc?.join(".")}: ${item.msg}`).join("; ")
      : typeof detail === "string" ? detail : `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  return data;
}
```

Register citizens with `POST /api/v1/auth/register`; all roles sign in through
`POST /api/v1/auth/login` with an email and password. Login returns
`access_token` and `token_type`. Send the token to `GET /api/v1/auth/me` and route
the UI using its `role`: `citizen`, `authority`, or `admin`. Keep session tokens
out of source code and Vite configuration. On 401, clear the expired session and
return to login; show 403 as an access restriction, 409 as a workflow conflict,
422 as field/business validation, and 429 as a retry delay. Responses are plain
objects or arrays, with no `data` wrapper. Lists use `offset` and `limit`.
Profile settings can update only the signed-in user's `full_name` and `phone`
through `PATCH /api/v1/auth/me`; role and department changes remain admin-managed.


## Complete screen-to-API implementation map

All paths below are relative to `/api/v1` unless marked otherwise. Use the full
methods, request fields, permissions and errors in [API_CONTRACT.md](API_CONTRACT.md).
No UI source was changed in this pass.

### Citizen and public surfaces

| Screen / flow | Exact backend support and frontend responsibility |
| --- | --- |
| Home | Public explanatory content; `GET /departments` supplies active civic categories. No invented public complaint feed/counts; live counts require authorized dashboards. |
| Citizen Login | `POST /auth/login`, then `GET /auth/me`; route only citizens into citizen surfaces. |
| Citizen Signup | `POST /auth/register` creates citizens only; never send role/department. |
| Registration/email OTP | Registration sends when Brevo is configured; `POST /auth/request-email-verification`, `POST /auth/verify-email`. Keep reporting available when unverified. |
| Forgot Password / Reset OTP | `POST /auth/forgot-password`, `POST /auth/verify-otp`, `POST /auth/reset-password`; keep generic issuance response, respect cooldown/429, clear old session after reset. |
| Report Issue | `POST /complaints`; optional `POST /intelligence/analyze-complaint` or `POST /chatbot/analyze` prepares editable suggestions. User explicitly confirms submission. |
| Map/location pin | Optional paired coordinates, accuracy, location_text/locality/area/ward in complaint POST; optional authenticated `POST /location/reverse` for editable hints. Manual address works without permission/geocoder. |
| Image evidence | After successful complaint creation, multipart `POST /complaints/{id}/evidence/upload`; list `GET /complaints/{id}/evidence`; obtain private URL via `GET /complaints/{id}/evidence/{evidence_id}/access`. Preserve the created complaint if upload fails; allow retry. |
| Voice/multilingual entry | `GET /language/capabilities` controls availability. `POST /language/translate` preserves text while disabled. Do not label text as translated or expose working ASR/TTS buttons until capability is available; always offer typed Unicode text. |
| Track Complaint | Authenticated `GET /complaints/{id}` and `GET /complaints/{id}/timeline`; own report only, no public lookup by ID. |
| Citizen Dashboard | `GET /users/me/dashboard` and `GET /users/me/complaints`. |
| My Complaints | `GET /users/me/complaints?offset=0&limit=20`, individual reports retained even when incidents are shared. |
| Complaint Detail | `GET /complaints/{id}`, `/timeline`, `/evidence`, `/incident` (all under that complaint); aggregate incident only, no other citizens' reports. |
| Resolution Verification / Reopen | `POST /complaints/{id}/verify` with resolved/feedback during the round; `POST /complaints/{id}/reopen-request` with reason after closure/expiry or prior response. Display incident deadline, quorum, pending response and closure basis. |
| Categories | `GET /departments`; categories are text, not hardcoded department IDs. |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`; pull-based, no websocket/push claim. |
| Profile | `GET /auth/me`, `PATCH /auth/me` (full_name/phone only); email verification through auth endpoints. |
| Help/Chatbot | `POST /chatbot/message` for public FAQ or scoped authenticated complaint lookup; optional multipart `POST /chatbot/analyze` for draft/image assistance. |
| Language selection/preferences | Client-owned locale preference; `GET /language/capabilities` for service status. No server preference endpoint; translation availability is independent of UI locale. |
| About | Static project content; no API needed and no government-integration claims. |
| Contact / FAQ | Static published contact/help links and local FAQ chatbot; no contact-ticket submission endpoint or invented support email. |
| Optional Verified Citizen | `GET /users/me/verification`; email trust works. DigiLocker/offline Aadhaar show unavailable state. `POST /users/me/verification/demo` with {} only when explicitly enabled in development, visibly labelled Demo Verified Citizen. Never request identity documents. |

### Authority and admin surfaces

| Screen / flow | Exact backend support and frontend responsibility |
| --- | --- |
| Dedicated Authority Login | Separate visual entry, same `POST /auth/login` and `GET /auth/me`; require role authority/admin, never infer role from email/domain. |
| Authority Dashboard | `GET /authority/dashboard`; department/officer scope enforced server-side. |
| All Complaints / Incident Ledger | `GET /authority/complaints` with documented filters; `GET /authority/incidents` for shared workflows. Report counts and incident counts are different concepts. |
| Incident/Complaint Detail | `GET /authority/incidents/{incident_id}?offset=0&limit=20` returns aggregate incident plus paginated retained reports. `GET /authority/complaints/{id}` and shared timeline/evidence routes give report detail. |
| Assignment / Routing | `PATCH /authority/complaints/{id}/assign`; choose department/officer from lists. Initial unassigned routing and cross-department transfers require admin. `PATCH .../status`, `POST .../remarks` track progress. |
| Confirm same incident | `GET /authority/complaints/{id}/incident-candidates`; explicit `POST /authority/complaints/{id}/incident` with incident_id/reason. Show text similarity, category match, distance/reasons as suggestions, never accuracy. |
| Department Dashboard / workload | Scoped `GET /authority/dashboard`, `/authority/complaints`, `/authority/officers`; admin `GET /admin/officers` supplies workload/availability. No separate redundant department-dashboard endpoint needed. |
| Resolution Evidence | Multipart `POST /complaints/{id}/evidence/upload` with evidence_type=resolution; `POST /authority/complaints/{id}/resolve` with resolution_notes and optional evidence_url. Upload metadata is shared with linked reports. |
| Verification/Reopen Audit | `GET /authority/incidents/{id}`, member `GET /complaints/{id}/timeline`; queue `GET /authority/complaints?status=verification_pending`. After expiry, `POST /authority/incidents/{id}/finalize-verification` with reason and existing resolution evidence. `POST /authority/complaints/{id}/reopen` reopens. |
| Analytics | `GET /authority/analytics/summary`, `categories`, `departments`, `priorities`, `trends`, `recent`; optional UTC date filters. Show empty/null results honestly. |
| Officers | `GET /authority/officers`; admins use `GET /admin/officers`, `POST /admin/authorities`, `PATCH /admin/users/{id}`. Secure admin provisioning only; no self-service staff signup. |
| Departments | `GET /departments`; admin `GET/POST /admin/departments`, `PATCH /admin/departments/{id}`. |
| Notifications | Same own-notification GET/read actions as citizens. |
| Profile / Settings | `GET/PATCH /auth/me`; editable name/phone only. If staff verified-email policy is enabled, allow email OTP completion before work APIs. Admin controls department/active status; locale/display preferences remain client-owned. |

There are no missing endpoints for these defined complaint/incident flows. Static
pages and client locale settings need no backend route. A contact-ticket service,
saved server-side language preferences, external push transport, refresh tokens,
or a forced staff first-login password change would be new product scope.

## Workflow and evidence presentation

Report statuses are `submitted`, `under_review`, `assigned`, `in_progress`,
`verification_pending`, `resolved`, `reopened`. Current verification values
are `pending`, `approved`, `rejected`, `reopened`. Severity/priority values
are `low`, `medium`, `high`, `critical`. Use dedicated actions for resolution,
verification and reopening; direct status PATCH cannot bypass them.

Every citizen report remains stored. Confirmed consolidation shares one incident
workflow; it does not hide or discard individual submissions. Defaults are a
72-hour round and 60% approval quorum rounded up, minimum one approval, against
the active reporter count at resolution. Configured values and deadline come
from the incident response; never hardcode the defaults in UI logic.
Quorum closes the shared incident while nonresponses stay pending. A reporter who
has not responded can reject before the deadline even after quorum closure.
After expiry staff must explicitly review existing notes/evidence and record a
reason to close; no response is not approval. Owners retain a reasoned reopen action.
Show staff-review closure separately from citizen approval; use the timeline for
past responses/rounds. One citizen's report can be approved before the incident
reaches quorum, so display both statuses.

Location is optional. MapLibre/Leaflet/OpenStreetMap can render the map later;
no Google Maps dependency is required. Reverse-geocoder hints may be unavailable
and do not verify an authority jurisdiction. Keep typed address/pin editable,
send coordinate pairs together, respect contract length limits, and display
returned attribution. Never block a report on location permission.

The chatbot analyze route takes optional text and/or a validated JPEG/PNG/GIF/WebP
image (5 MiB limit), optional coordinates and permitted complaint reference.
Its `requires_user_confirmation=true` response is a draft. Optional Gemini
failure falls back to local text suggestions; local code does not inspect image pixels.
Persistent evidence uploads accept JPEG/PNG/WebP up to 10 MiB by default
(they do not accept GIF). Display upload progress/failure separately from complaint
success. Private signed links expire in five minutes; request new access links
after expiry and do not save them as permanent public image URLs.

## Availability and external setup

Working: SQLite, auth/OTP contract, scoped complaint/incident lifecycle, optional
trust metadata, notifications, local intelligence, and provider fallbacks.
Optional: configured Brevo, private Storage, Gemini, reverse geocoding.
The closing-pass Storage attempt was blocked by DNS of the configured project URL
before upload; the operator must correct that local setting and rerun the README
smoke command. Brevo's live test requires an explicitly selected recipient.
Neither blocks frontend development against the core SQLite APIs/mocked errors.

Pending: actual DigiLocker requester approval/integration, trusted offline Aadhaar
validation and BHASHINI approved service configuration. Never present a demo as
government verification, collect Aadhaar/KYC data, or suggest identity is required
for reporting. The offline ML/data tooling is ready for a separate reviewed dataset
and training phase; no production accuracy is claimed.

## One Civic Vanguard design system

Use deep civic navy for structure/navigation, white or light neutral surfaces,
saffron/orange for primary interaction, and emerald green for verified/resolved
states. Use the same typography, spacing, controls, validation, cards and status
badges across both surfaces. Pair colors with readable labels/icons; demo trust
must say **Demo Verified Citizen** rather than using a real-verification badge.

Citizen layouts can emphasize approachable reporting and progress; authority
layouts can use denser tables, queues and filters. They remain one product with
shared components and visual language. Communicate people, civic infrastructure,
intelligent routing, transparency and community verification through the content
and information hierarchy. No frontend implementation is included in this pass.
