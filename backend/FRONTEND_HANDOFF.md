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

The backend reads process environment variables; it does not automatically load
a `.env` file. Default CORS origins are `http://localhost:5173` and
`http://127.0.0.1:5173`. Set `CORS_ORIGINS` before starting the backend if your
frontend uses another origin. In development, an omitted `JWT_SECRET` generates
a temporary secret for each backend process, so sign in again after a restart or
reload. A stable secret can be configured in the backend environment only.

Supabase is not required for frontend development. Live PostgreSQL connectivity
remains unverified; the last user-terminal diagnostic reported TLS certificate
rejection, code 92. SSL verification remains enabled. Do not put database URLs,
database passwords, signing secrets, or CA certificates in frontend configuration.

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
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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

## Wire the screens

| Screen | Main APIs |
| --- | --- |
| Citizen dashboard and reports | `/api/v1/users/me/dashboard`, `/api/v1/users/me/complaints`, `/api/v1/complaints` |
| Profile and settings | `GET /api/v1/auth/me`, `PATCH /api/v1/auth/me` |
| Complaint detail and history | `/api/v1/complaints/{id}`, `/api/v1/complaints/{id}/timeline`, `/api/v1/complaints/{id}/evidence` |
| Citizen resolution review | `POST /api/v1/complaints/{id}/verify` with `resolved` and optional `feedback` |
| Authority queue and work | `/api/v1/authority/dashboard`, `/api/v1/authority/complaints`, `/api/v1/authority/officers`; complaint actions `assign`, `status`, `remarks`, `resolve`, `reopen` |
| Verification queue | `/api/v1/authority/complaints?status=verification_pending` |
| Admin accounts and routing | `/api/v1/admin/users`, `/api/v1/admin/authorities`, `/api/v1/admin/officers`, `/api/v1/admin/departments` |
| Authority/admin charts | `/api/v1/authority/analytics/{summary,categories,departments,priorities,trends,recent}` — choose one suffix |
| Notifications | `/api/v1/notifications` and documented read actions |
| Local ML assistance | `POST /api/v1/intelligence/analyze-complaint` |
| Support chatbot | `POST /api/v1/chatbot/message` (JSON FAQ/status) and `POST /api/v1/chatbot/analyze` (multipart draft/image suggestions) |

Use the contract for each action's method and fields. Fetch active departments
from `GET /api/v1/departments` instead of hardcoding IDs. Citizens see their own
reports; authority access follows department/officer assignments; admins have
global access. UI visibility supplements the backend's authorization checks.

Statuses are `submitted`, `under_review`, `assigned`, `in_progress`,
`verification_pending`, `resolved`, and `reopened`. Staff resolution submits a
complaint for citizen verification; approval becomes `resolved`, while rejection
becomes `reopened`. Verification values are `pending`, `approved`, `rejected`, and
`reopened`. Severity and priority values are `low`, `medium`, `high`, `critical`.
Use dedicated resolve/verify/reopen actions for these transitions.

ML suggestions do not replace the citizen's selected category or priority and do
not merge complaints. Chatbot replies do not change complaint state. Evidence
currently stores HTTP(S) URL metadata; there is no binary upload endpoint. Password
reset OTPs print to the backend terminal in development; external email delivery
is not connected. All API times represent UTC; see the contract for timestamp
format details.

The chatbot analyze endpoint accepts optional text, an optional JPEG/PNG/GIF/WebP
image (5 MB maximum), optional coordinates, and an optional permitted complaint ID;
include at least text or an image. Send it as `multipart/form-data`. It returns an
editable title/description draft and the same local intelligence suggestions. The
response always sets `requires_user_confirmation` to true; it never submits a
complaint. Configure `GEMINI_API_KEY` only in the backend environment or ignored
`backend/.env`; `GEMINI_MODEL` is optional. Without a working Gemini service, local
FAQ and text-based draft behavior remains available. Local fallback does not inspect
image pixels and asks for a written description instead.
