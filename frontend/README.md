# NagrikSetu frontend

React/Vite frontend for the existing NagrikSetu FastAPI backend. Citizen, Authority
and Admin use one bearer-token session and the same backend authentication APIs.

## Local development (PowerShell)

```powershell
Set-Location C:\NagrikSetuFrontend\frontend
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Or copy `.env.example` to `.env.local`, set its public API URL, and restart Vite.
Never put database passwords, JWT secrets or access tokens in Vite configuration.
The backend's default CORS allows localhost/127.0.0.1 on port 5173.
MapTiler is optional; manual location reporting works without a map key.

```powershell
Set-Location 'C:\Users\Asus\OneDrive\Desktop\NagrikSetu\NagrikSetu\backend'
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:APP_ENV = "development"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The backend applies migrations at startup. See backend README/API_CONTRACT and
FRONTEND_HANDOFF for database/provider configuration. Development JWTs expire and
are invalidated after restart unless you configure a stable backend JWT_SECRET.

Accounts must exist. Public signup creates citizens. Existing staff use Authority
Login; no staff password or role is fabricated by the frontend. For optional
marked development fixtures, run `python -m app.seed_dev --yes` using the backend
virtual environment; it prompts for a password. For real staff provisioning, use
the backend's `app.create_staff` command or an existing Admin account.

## Routes and session

Citizen login: `/login`; signup: `/signup`. The citizen login page links to
`/authority/login`. The canonical staff dashboard is `/authority/dashboard`.
`/authority-dashboard` redirects there. `/admin` is an Admin-only alias.
All staff workspace routes require authority/admin; citizen reporting/list/detail
routes require citizen. Tokens are stored in sessionStorage (tab lifetime), with
in-memory fallback if browser storage is blocked. Reload validates `/auth/me`;
roles come only from that response. Logout and 401 clear the token/session;
JWT expiry also clears the current UI session. 403 remains an access restriction.

## Verification

```powershell
npm.cmd run build
npm.cmd run lint
node --test tests/api.test.mjs
```

Real HTTP service smoke, with an isolated temporary SQLite database and generated
credentials (no production data is changed):

```powershell
Set-Location 'C:\Users\Asus\OneDrive\Desktop\NagrikSetu\NagrikSetu\backend'
$env:PYTHONPATH = "."
.\.venv\Scripts\python.exe tests/run_frontend_smoke.py --frontend C:\NagrikSetuFrontend\frontend
```

See INTEGRATION_REPORT.md for exact changes, verified behavior and remaining
browser/provider checks. ML text/image classification, department/category/
priority/severity suggestions, reviewed datasets and evaluation are the next major
phase; this integration pass did not implement or train ML.
