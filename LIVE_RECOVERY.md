# Live service recovery — 26 October 2026

The code changes in this release improve navigation, account flows, authored
Hindi/English interface labels, and read-only database diagnostics. They do not
establish that the production backend is working. No production database or
hosting configuration was changed by this task.

## Confirmed findings

- Frontend root `https://nagriksetu-frontend-aw05.onrender.com/`: HTTP **200**.
- A direct request to `/report-issue`: HTTP **404**. The Render Static Site SPA
  rewrite is not effective. Client navigation and direct refresh are separate checks.
- Backend `/health` and `/health/ready` did not return a response in initial
  20-second checks. A repeat readiness request timed out after **55 seconds**, with
  no HTTP response. This confirms unavailability from this audit environment;
  it does not identify the SQL/TLS root cause.
- Protected guest routes were intentional, but their login redirect lacked a reason.
  Registration links already carried route state; regression tests now cover the
  complete guest → login → signup → login → original destination flow.
- Header language control was inert, unread indicator unconditional, and combined
  Login/Register action ambiguous. Homepage anchors caused full requests to SPA
  routes; the homepage ward filter did not filter anything.
- Existing Hindi chat responses contained `?` placeholders. The selector was not
  sent to the backend and returned language metadata was ignored. FAQ messages
  also incorrectly produced a local complaint draft card.

## Corrections and tested boundaries

- Guest redirects explain the protected action, retain query/hash through login
  and registration, and distinguish expired sessions. Backend failures show an
  unavailable/retry state. Citizen/staff guards remain enforced.
- Header has distinct Login/Create Account links, working authored language
  selection, blocked-storage fallback, and authenticated unread notifications.
  Marking notifications read refreshes the badge. Guest/failed requests show no badge.
- Navigation, account forms, common loading/errors, core reporting labels and
  tracking entry support Hindi/English. User records, category names and server
  messages are not automatically translated. **Full-site translation is incomplete.**
- Homepage links use client navigation; category hints select only categories
  returned by the API. Unknown/unavailable categories require an explicit choice.
  The decorative ward filter is removed. Advisory routing claims no longer imply
  an official government service or guaranteed repair time.
- Report category/headline/description labels are associated with controls.
- Narrow chat repair sends `requested_language`, displays real response metadata
  and only server-supplied authenticated complaint snapshots, restores text on
  failure, fixes existing Hindi guidance and gives the mobile composer wrapping.
  It does not merge the unfinished assistant architecture or claim voice is ready.
- Database diagnostics traverse `orig`, cause, context, nested driver arguments
  and exception groups. They report a controlled failure stage, safe driver class,
  SQLSTATE/certificate code and non-secret configuration facts. Raw errors, URLs,
  usernames, passwords and CA paths are withheld. Certificate/hostname validation
  is unchanged. Diagnostics run `SELECT 1` only; no migrations or data writes.

## Verification

- Full backend pytest: **172 passed, 57 subtests passed, 1118 warnings**, 259.50s.
- Full unittest: **172 tests, OK**, 252.193s. Backend source hashes unchanged during tests.
- Frontend: **18 passed, 0 failed**. Rendered DOM tests exercise actual components,
  account redirects, registration, language changes, unread state, session expiry,
  staff permissions and mobile menu controls.
- Lint: **exit 0**, 21 warnings (20 existing plus the shared language provider/hook
  Fast Refresh export warning). Production build: **exit 0**, bundle-size warning.
- Dependency `pip check`: **passed** on rerun with the ordinary Windows environment.
  The first isolated wrapper omitted Windows profile variables, causing pip's
  platform-directory lookup to fail; this was a harness failure, not a dependency conflict.
- Real local HTTP frontend-service → Uvicorn → disposable SQLite smoke **passed**
  registration/login, role permissions, complaint lifecycle, assignment, tracking,
  dashboards, resolution/verification, notifications, analytics and logout. It does
  not establish live PostgreSQL behavior. Its initial launcher omitted `PYTHONPATH`;
  setting it to this worktree's backend fixed that test-harness import failure.
- A first frontend test harness attempt incorrectly loaded a CommonJS router
  through SSR; it was corrected to use the package import and all final tests pass.
- Real browser inventory is empty; both in-app browser and Chrome creation were
  unavailable. Visual layout, actual microphone/speaker behavior, phone/browser
  testing and live authenticated workflows are **unverified**, not passing results.
- Audit logs and preservation/secret-scan evidence are outside Git in
  `../live-recovery-audit/`. They contain no provider credential values.

## Existing bilingual feature branch

`feat/bilingual-assistant` and its uncommitted changes are preserved in
`../bilingual-assistant`. The partial draft/context/knowledge work is not integrated
or claimed complete. Expanded bilingual FAQ, safe conversation context and browser
speech controls still require implementation completion, end-to-end tests and review.
No neural model was trained. Existing local retrieval/rules and optional Gemini
are not represented as a custom trained model.

## Exact next Render/Supabase actions

1. Select the published `main` revision for both services. Redeploy the backend
   for the new diagnostic code and the frontend for the navigation/interface fixes.
   No Render configuration change was made automatically.
2. In the **frontend Static Site**, add a **Rewrite**: Source `/*`, Destination
   `/index.html`. It is already declared in `render.yaml`; manual services must
   receive it in the dashboard. `vercel.json` does not configure Render. Repeat
   direct requests/refreshes to `/report-issue`, `/track-complaint`, `/notifications`
   and `/authority/dashboard` and confirm HTTP 200 serving the SPA.
3. Keep backend `APP_ENV=production`, stable `JWT_SECRET`, `DATABASE_URL` and exact
   HTTPS frontend `CORS_ORIGINS` in process environment variables. Keep frontend
   `VITE_API_BASE_URL` equal to the backend HTTPS origin, then rebuild.
4. Copy the exact **Session pooler** URI from the intended active Supabase project's
   Connect panel: pooled host/username, port 5432, database and percent-encoded
   password. Use the app's pg8000 driver; do not guess the project/region hostname.
   `sslmode=require` still uses certificate and hostname verification in this app.
   Supply the trusted PEM CA through `SSL_CERT_FILE`; file existence alone does not
   establish that its trust chain or hostname is correct.
5. Run `python -m app.db.diagnose` in the backend's intended environment and capture
   its **JSON output only**. It is read-only and exits 0 for success or 1 for failure.
   For `certificate_verification`, resolve the reported trust/hostname issue;
   for `driver_argument_type`, inspect URL options supported by pg8000; for SQLSTATE
   28P01/28000, check database password/pooled user; for DNS/timeout, check the actual
   host, project availability and network. Do not disable TLS or print raw errors.
   An unclassified result remains a blocker requiring further controlled diagnosis.
6. If the start command was temporarily replaced with the diagnostic, restore:
   `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`.
   Keep one worker/instance initially. Review current migration state and take a
   recoverable backup before startup applies existing migrations/seeds. No schema
   reset, downgrade, production staff creation or data transfer was performed here.
7. Require `/health/ready` HTTP 200 with `provider=postgresql`, `connected=true`.
   `/health` is liveness only. Confirm exact-origin CORS, staff provisioning,
   signup/login → report → owner tracking → staff routing/resolution → citizen
   verification, and persistence through a controlled restart. Do not use public
   complaint data or real personal information for the initial smoke test.
8. Verify private Storage upload/retrieval and Brevo delivery separately if included
   in the demonstration. MapTiler is optional; GPS/manual address input remains.
   These optional services are not proven healthy by the database readiness endpoint.

Production database connectivity, migrations against the real database, persistence,
staff accounts, live upload/email and browser workflows remain open deployment checks.
