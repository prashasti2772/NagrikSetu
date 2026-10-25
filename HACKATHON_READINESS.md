# Anveshana readiness — 26 October 2026

Target: 27 October 2026 (Asia/Calcutta). This report supersedes older hosting and
branch instructions for this demo. **Local validation is not a live deployment.**
Local source verification has passed. Git publication and safe main integration
were explicitly authorized on 26 October. The user is configuring Render and
Supabase manually; no live service, database migration, staff provisioning,
credentialed provider test or live-data change is performed by this release task.

## Resumed verification — 25 October 2026

Continued from the existing worktree and logs. No application code needed another
correction. The historical `DEPLOYMENT_READINESS.md` is now explicitly marked
superseded because its old branch, SQLite and test instructions conflict with this
release. Existing source changes and teammate work remain intact.

- Live read-only `git ls-remote` still reports GitHub `main` at
  `4233b3cc0eeef7f35cfd6a511ea18aa149f16405`; the frontend, backend and deployment
  branch tips also match the previously recorded refs. Release HEAD `a51711e`
  and remote main have the same source tree. Local `main` remains `21cb153`.
- The original checkout still has the same 29 individual pending paths and all
  122 original source/config/report hashes. No index or branch was changed.
- Final pytest log: **163 passed, 1118 warnings, 45 subtests passed in 91.06s**.
  Current collection is 163 tests; the backend edits still match the reviewed
  patch and predate that final log. The historical unittest result (164 tests,
  OK in 218.954s) includes one subsequently removed redundant pool-timeout test;
  use the final-source rerun result below instead of that historical count.
- Final-source unittest rerun: **163 tests, OK in 256.298s, exit 0**. All 120
  snapshotted backend source/config files remained byte-identical before/after.
  Current pytest/unittest collection sets are identical. Evidence and the count
  reconciliation are in `../hackathon-audit/resume-backend/`.
- Frontend rerun: **5 passed, 0 failed**, lint **0 errors / 20 warnings**, production
  build **exit 0 / 1961 modules / 1.31s** using a synthetic HTTPS API origin and no
  MapTiler key. Logs: `../hackathon-audit/resume-frontend-{tests,lint,build}.log`.
- Fresh production import, liveness and CORS checks pass: listed origin preflight
  **200**, unlisted origin **400**; mocked PostgreSQL readiness/database endpoints
  correctly return **200/503**. These checks intentionally run no lifespan,
  database connection or provider request; they do not establish live readiness.
- Security review covered **207 working files and 201 index blobs**. Broad pattern
  matches were reviewed as synthetic fixtures, documentation or password UI
  labels; **zero unresolved credential findings**. Ignored environment, database,
  backup and user-data files were not opened. Evidence is in
  `../hackathon-audit/final-release/`.

The Alembic `Column.copy()` deprecations, 20 frontend lint warnings and large-bundle
notice are warnings, not failing checks. PowerShell's `NativeCommandError` wrapper
around warning output does not override the successful process exit or test summary.

**Git publication gate cleared on 26 October:** the user confirmed that Render
backend/frontend services do not exist yet and explicitly authorized publication
of the 27 verified paths. Live URLs, PostgreSQL persistence, deployed API/CORS and
browser workflows are post-deployment checks, not Git-publication prerequisites.
Optional private Storage and Brevo delivery remain unverified. No live deployment
is authorized in this task. The source snapshot below describes the state before
this release commit; final remote commit verification is recorded separately in
`../hackathon-audit/publication/` and the release handoff.

## Source and preservation — pre-publication baseline

- Actual GitHub `main` was checked read-only: `4233b3cc0eeef7f35cfd6a511ea18aa149f16405`.
  Render's currently deployed commit/settings were not inspected; this is the
  verified GitHub production branch, not a verified running release.
- The original checkout is `../NagrikSetu`, branch `backend-prashasti`, HEAD `36a1de6`.
  It is 3 commits behind main. Its 10 tracked modifications and 19 individual
  untracked files were preserved. All 119 backend files already match main;
  there is no historical local backend fix missing from main.
- Local `main` is stale at `21cb153`, 13 commits behind remote main. Do not deploy
  that local branch tip or replace the dirty checkout to update it.
- Corrections are **uncommitted** in this existing `deployment-preparation`
  worktree on `deploy/nagriksetu-prototype`, HEAD `a51711e`. Its starting tree was
  identical to current main, although main has one additional merge commit.
- The teammate frontend branch and all Git refs/indexes were preserved.
- `../hackathon-audit/git-preservation-final.json` verifies the original checkout's
  branch, HEAD, status and all 122 original source/config/report hashes are unchanged.

## Reviewed corrections included in this release

| Paths, relative to this worktree | Change |
| --- | --- |
| `backend/app/core/config.py` | Refuse SQLite/missing PostgreSQL, disabled TLS, missing stable JWT and unsafe CORS outside development. Configuration fails before startup migrations. |
| `backend/app/db/database.py` | Reduce PostgreSQL pool checkout wait from 30 to 3 seconds; retain verified TLS and the existing 10-second socket timeout. |
| `backend/tests/test_production_config.py` | Regression coverage for production configuration, early failure and pool exhaustion. |
| `backend/.env.example`, `backend/README.md`, `backend/OPERATIONS_RUNBOOK.md` | Explain development-only SQLite fallback and production prerequisites. |
| `frontend/vite.config.js`, `frontend/src/services/apiBase.js` | Require a public HTTPS API origin for production builds; normalize a trailing `/api/v1/`. |
| `frontend/src/services/api.js` | Clear malformed JSON/list errors alongside existing network, validation, permission and expiry handling. |
| `frontend/src/auth.jsx`, `frontend/src/services/navigation.js`, `frontend/src/pages/{Login,AuthorityLogin}.jsx` | Preserve requested route/query through login with role-appropriate local destinations. |
| `frontend/src/components/home/ComplaintTracker.jsx`, `frontend/src/pages/TrackComplaint.jsx` | Make the homepage tracker functional and retain its complaint ID through login. |
| `frontend/src/components/common/{Navbar,AuthorityNavbar,AuthorityWorkspaceLayout,Footer}.jsx` | Working navigation/footer links, staff dashboard links, mobile menu accessibility and logout when browser storage is blocked; repair undefined dormant handlers. |
| `frontend/src/components/report/ReportForm.jsx` | Department/category loading, retry and empty-state handling; required headline/description validation. |
| `frontend/tests/{api.test,live-api-smoke,deployment.test}.mjs` | API/configuration/navigation regressions and updated real-HTTP smoke loader. |
| `render.yaml`, `README.md`, `HACKATHON_READINESS.md`, `DEPLOYMENT_READINESS.md` | Render reference configuration, current verification and explicit supersession of historical settings. |

No features were removed or redesigned. No production database migration was added.
Use this allowlist for source publication; do not indiscriminately
stage historical dirty work or audit directories.
The original 26-file review patch is `../hackathon-audit/proposed-changes.patch`.
It is preserved as earlier evidence; the current reports have subsequent updates.
There are now 27 pending paths, including the historical report's supersession notice.

## Validation

Results and credential-free logs are in `../hackathon-audit/`.

- Backend final-source pytest suite: **163 passed, 1118 warnings, 45 subtests passed**.
  Final-source unittest: **163 tests, OK**, exit 0. All database tests used disposable local SQLite;
  PostgreSQL-specific connection behavior was checked through mocks/offline SQL.
- Frontend tests: **5 passed**. Lint: **passed**, with the same 20 existing warnings.
- Production frontend build: **passed**, using a synthetic HTTPS API origin;
  the generated bundle is a test artifact, not a bundle for the live service.
  Existing bundle-size warning remains.
- Actual builds with missing or HTTPS-loopback API configuration correctly fail.
- Production app import and HTTPS CORS allow/reject preflights: **passed** with
  synthetic production settings, DB/network access blocked and lifespan not run.
- Real HTTP frontend API service → Uvicorn → temporary SQLite: **passed** for
  signup/login, role restrictions, complaint creation/detail/tracking, dashboards,
  assignment, status, remarks, profile, resolution, citizen verification,
  notifications, analytics, fallback chatbot and logout.
- Dependency `pip check`, Python compilation and `git diff --check`: **passed**.
  No backend linter is configured. Existing Alembic `Column.copy()` warnings remain.
- PostgreSQL Alembic SQL generation: **passed offline**, all six revisions through
  `0006_identity`. This generated SQL targets a new database, not an existing
  installation and does not prove live PostgreSQL connectivity or persistence.
- `render.yaml` parses; settings follow current Render documentation. It has not
  been submitted to Render's authenticated Blueprint validator or applied.
- The prior audit could not complete browser automation. Desktop/mobile visual
  checks and browser-enforced live CORS remain pending. Temporary QA servers were
  stopped; this resume did not restart them.

## Render settings to enter manually

Keep automatic deploys **Off** while the user finishes manual environment setup.
`render.yaml` is a reference; applying it creates/deploys services. Copy settings
to the services you are already configuring instead of creating duplicates.

| Setting | Backend Web Service | Frontend Static Site |
| --- | --- | --- |
| Repository / branch | `prashasti2772/NagrikSetu` / `main` | Same |
| Root Directory | `backend` | `frontend` |
| Runtime version | `PYTHON_VERSION`: `3.13.15` | `NODE_VERSION`: `24.16.0` |
| Build | `python -m pip install -r requirements.txt` | `npm ci && npm run build` |
| Start / publish | `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1` | `dist` |
| Health check | `/health/ready` | Not applicable |
| Redirects/Rewrites | Not applicable | Source `/*`, Destination `/index.html`, Action **Rewrite** |

The wildcard rewrite is required for direct visits/refreshes of React routes.
`vercel.json` does not configure Render. Paths/build commands are relative to each
service root. References: [Render rewrites](https://render.com/docs/redirects-rewrites),
[monorepos](https://render.com/docs/monorepo-support),
[Python version](https://render.com/docs/python-version),
[Blueprint settings](https://render.com/docs/blueprint-spec).

### Environment variable names

| Service / purpose | Names |
| --- | --- |
| Backend, required production | `APP_ENV`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` |
| Backend runtime pin | `PYTHON_VERSION` |
| Frontend, required at build time | `VITE_API_BASE_URL` |
| Frontend runtime pin | `NODE_VERSION` |
| Private uploads | `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET` |
| Recovery / email verification | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`; optional `BREVO_SENDER_NAME` |
| Optional hosted map | `VITE_MAPTILER_API_KEY` |
| Optional Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| Conditional trusted database CA | `SSL_CERT_FILE` |
| Optional limits/policy | `EVIDENCE_MAX_BYTES`, `STAFF_REQUIRE_VERIFIED_EMAIL`, `VERIFICATION_WINDOW_HOURS`, `VERIFICATION_QUORUM_PERCENT` |

Set production mode explicitly. Use a stable, random backend JWT secret of at least
32 characters. CORS must contain the exact HTTPS frontend origin(s), comma-separated,
without paths, trailing slashes or wildcards. The frontend API setting should be the
backend HTTPS origin; `/api/v1` is added by the API service (a supplied trailing
prefix is normalized). Rebuild the frontend after changing a `VITE_*` variable.
Never put database, storage, email, Gemini or JWT credentials in frontend variables.

For existing Render services, enter missing variables directly in their environment
settings. Blueprint `sync: false` prompts apply only at initial creation; updates
ignore those entries ([Render environment settings](https://render.com/docs/blueprint-spec#prompting-for-secret-values)).

### Vercel frontend alternative

If the existing frontend is hosted on Vercel, use branch `main` after verified
publication, root `frontend`, preset **Vite**, Node **24.x**, install `npm ci`, build
`npm run build`, output `dist`. The existing `frontend/vercel.json` supplies the SPA
rewrite. Set `VITE_API_BASE_URL` for Production and any intended Preview environment,
then rebuild; permit each intended frontend origin explicitly in backend CORS.
These settings match [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite).

`VITE_MAPTILER_API_KEY` is optional: without it, the current map shows a clear
manual-location fallback and GPS/manual address/coordinates remain available.
No key-free tile basemap has been implemented. If enabling MapTiler, restrict its
Allowed HTTP origins to the actual frontend domain(s), and verify rendered tiles
in the deployed browser ([MapTiler key configuration](https://docs.maptiler.com/guides/developer/credentials/api-key/)).

These core/provider variables were absent from the inspected local process, and
the clean integration worktree has no local environment files. This says nothing
about the settings you are entering in Render; hosted values were not inspected.

## Supabase and database gates

1. In the intended active Supabase project, copy the **Session pooler** URI from
   **Connect**. Use its exact host and pooled username, port **5432**, intended
   database and percent-encoded password. Do not guess the host or use the Storage
   API URL/key as SQL credentials. `postgres://` and `postgresql://` are normalized
   to `postgresql+pg8000://`; certificate and hostname verification remain enabled.
   [Supabase connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres)
2. With production configuration entered privately, run the read-only diagnostic
   `python -m app.db.diagnose` in the backend environment. Confirm connectivity
   without logging the connection string. No live diagnostic was run in this task.
3. Review migrations and take a recoverable backup before the approved first
   startup. Startup automatically upgrades to `0006_identity` and idempotently seeds
   11 departments. It performs schema/reference-data writes; keep **one worker and
   one instance** initially. Do not run downgrade/reset/drop operations. Existing
   database compatibility must be checked against its real migration state.
4. PostgreSQL selection does **not** transfer SQLite users, complaints or staff.
   No default admin/authority exists in a new database. After approval, provision
   the intended administrator using `python -m app.create_staff` (see its `--help`;
   password is prompted), then create scoped authorities through the Admin UI/API.
   Staff email enforcement requires verified staff and working email delivery.
5. For photos, configure the authoritative Supabase Project URL and backend-only
   server credential, and create/select a **private** `complaint-evidence` bucket
   (or set the bucket variable). Allow JPEG/PNG/WebP; align its size limit with the
   default 10 MiB application limit. Test authorized upload and signed retrieval.
   No real upload or bucket check was performed.
6. The app uses its own JWT/roles and SQL backend, not Supabase Auth. Disable
   unnecessary public Data API exposure or review grants/RLS on application tables;
   do not add public policies to make the frontend work. See the operations runbook.

`/health/ready` checks database connectivity only, independently of optional
providers. Production must show `database.provider: postgresql` and `connected: true`.
It does not prove Storage/email/Gemini health. Database socket timeouts can still
exceed Render's health-probe window during an outage; no sub-five-second total
readiness bound is claimed.

## Demo scope and remaining blockers

| Feature | Evidence / readiness |
| --- | --- |
| Homepage/navigation and login return route | Local code/build/unit checks pass; visual browser checks pending. |
| Citizen signup/login; text complaint reporting/tracking | Real local HTTP workflows pass with temporary SQLite. Production requires verified PostgreSQL and matching API/CORS. |
| Admin/authority dashboards, assignment and resolution | Local role workflows pass; real database staff provisioning is still required. |
| Persistence across Render restart/redeploy | **Unverified blocker** until PostgreSQL is connected and a controlled restart check passes. SQLite tests are demo-only. |
| Photos/private evidence | Graceful failure without Storage; full upload demo requires verified private Storage configuration. Complaint creation is retained if its upload fails. |
| Password recovery/email verification | Provider delivery unverified. Without Brevo, production returns a controlled unavailable error. Signup/login remain available. |
| Text chatbot/local advisory analysis | Local fallback tested; Gemini is optional and unverified live. |
| Hosted maps | Provider key unverified; manual location input remains available. |
| Bhashini/translation, DigiLocker/Aadhaar verification, identity masking, trained ML/image classification UI | Disabled, incomplete or explicitly marked pending; do not present as working integrations. Homepage ward filter is decorative. |

## Git publication and manual deployment sequence

1. Local verification has passed. Fetch the latest `origin/main` and review the
   listed changes against that tip. Publication is explicitly authorized; live
   environment setup does not block it. Commit only reviewed source/configuration/reports, integrate
   through a clean worktree with a normal merge or PR, and never force-push or
   overwrite teammate work. Until publication, main omits these corrections.
2. The user finishes the private Supabase connection/backup/schema review and Render environment
   setup above. Keep optional services unset if not ready; confirm staff provisioning
   and private uploads if those are part of the presentation.
3. The user manually deploys the reviewed backend commit. Verify `/health`,
   `/health/ready` and real PostgreSQL migration head; verify the actual frontend
   origin is permitted while an unlisted origin is rejected.
4. The user builds/deploys the reviewed frontend with the real backend HTTPS origin and SPA
   rewrite. Recheck both deployed commit IDs; refresh `/report-issue`,
   `/track-complaint?id=...` and `/authority/dashboard` directly.
5. Run controlled live signup/login → report → owner tracking → admin assignment →
   authority status/resolution → citizen verification. Verify unauthorized role and
   cross-citizen access fail. Test private upload/retrieval if configured, and verify
   the same complaint survives a controlled backend restart. Complete phone-width
   navigation/form/dashboard checks before presenting.

The user confirmed no Render services exist yet. Live deployment is not established;
public URLs will be needed only for actual post-deployment checks after manual setup.
