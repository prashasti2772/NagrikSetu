# NagrikSetu deployment readiness — 14 October 2026

**Status: local prototype checks pass; deployment remains blocked by source publication, persistence and production configuration.** No push, merge, reset, commit or deployment was performed. Existing teammate work was preserved. Credential values are omitted.

The exact source and Git state are:

| Component | Local source | Branch / remote state |
|---|---|---|
| Backend repository | `C:\Users\Asus\OneDrive\Desktop\NagrikSetu\NagrikSetu` | Current `backend-prashasti`; HEAD `36a1de6535a54570b72369c4049632074aee6a08` |
| Backend service | `C:\Users\Asus\OneDrive\Desktop\NagrikSetu\NagrikSetu\backend` | GitHub service root: `backend` |
| Working frontend | `C:\NagrikSetuFrontend\frontend` | No local Git repository, branch or remote |
| Existing GitHub frontend | Repository branch `frontend`, root `frontend` | Remote HEAD `331a32ff47756a8028ee15df2d7edbc30ce4b009`; lacks the current local API service and auth context |
| Main branch | Backend checkout local `main`, GitHub `main` | HEAD `21cb153252ed328115dd1d80aa1ad2ac4588e845`; contains only README |

Remote `origin` is [prashasti2772/NagrikSetu](https://github.com/prashasti2772/NagrikSetu). Live branch names and commit IDs were verified with read-only `git ls-remote`; no existing refs were fetched or changed. Cached backend refs include `origin/backend-prashasti`, `origin/main`, and `origin/HEAD -> origin/main`.

The backend initially had ten modified tracked files plus untracked source, tests, operations documentation and ML files/directories. Modified files were `README.md`, `backend/app/routers/{chatbot,complaints,health}.py`, `backend/app/schemas/chatbot.py`, `backend/app/services/{gemini,intelligence}.py`, and `backend/ml/{.gitignore,data.py,prepare.py}`. Current routers/services depend on untracked `chat_context.py`, `complaints.py`, `conversation.py` and `ml_artifacts.py`. Deploying only the existing GitHub commit would omit the current working prototype changes. No teammate changes were staged or committed. The frontend cannot have a Git working-tree status until it has an approved repository association.

Use these Render settings after source and configuration blockers are resolved:

| Setting | Exact preparation |
|---|---|
| Service type | Web Service |
| Repository | `prashasti2772/NagrikSetu` |
| Branch | `backend-prashasti`, after approved publication of the current prototype |
| Root directory | `backend` |
| Runtime | Python 3 |
| Python version | `3.13.15`, pinned in `backend/.python-version` to match validation; leave any runtime override unset |
| Build command | `python -m pip install -r requirements.txt` |
| Start command | `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1` |
| Health check path | `/health/ready` |
| Instances / workers | One initially |
| Automatic deploys | Off until approval |

The commands run in the configured GitHub root directory, not either Windows directory. Render supplies the port. Startup applies Alembic migrations and idempotently seeds departments; it creates no staff accounts. Keep one worker/instance for this prototype's in-memory draft/rate-limit state and startup migrations. Readiness must respond within Render's five-second health-check limit; optional Storage does not gate this database-only endpoint. The entrypoint and `/health`, `/health/db`, `/health/ready`, `/health/integrations` are verified. Integration health reports configuration presence only. These settings follow [Render FastAPI](https://render.com/docs/deploy-fastapi), [root directory](https://render.com/docs/monorepo-support), [Python version](https://render.com/docs/python-version) and [health-check](https://render.com/docs/health-checks) documentation.

Use these Vercel settings after the working frontend is incorporated into an approved Git source:

| Setting | Exact preparation |
|---|---|
| Repository branch | Existing `frontend` branch only after reconciling current local source with approval |
| Root directory | `frontend` for that branch; the selected directory must contain the current frontend package.json |
| Framework preset | Vite |
| Node version | `24.x` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Routing | Project-root `vercel.json` rewrites `/(.*)` to `/index.html` |
| Deployment approval | No deployment authorized |

The API variable must identify the HTTPS backend origin; the API service itself adds `/api/v1`, so do not append that prefix to the configured origin. Configure the production value before building and rebuild when it changes. Set corresponding exact frontend origins in backend CORS, including any deliberately supported preview origins. Preview URLs are not automatically allowed. Vite embeds frontend variables in browser bundles; backend credentials must stay in Render. Sources: [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite), [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Vite environment variables](https://vite.dev/guide/env-and-mode).

Environment names and local findings are below. Hosting account variable provisioning was not inspected; local presence does not provision Render or Vercel.

| Variable names | Requirement / finding |
|---|---|
| `APP_ENV`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` | Required backend production configuration; absent from the inspected process environment |
| `VITE_API_BASE_URL` | Required frontend production configuration; present locally but uses a local-only backend |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET` | Required for existing upload functionality; present in ignored local configuration, endpoint DNS fails |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Required for existing password recovery/email verification; present locally, live delivery unverified |
| `BREVO_SENDER_NAME` | Optional email display setting; present locally |
| `VITE_MAPTILER_API_KEY` | Required for hosted basemaps; present locally, browser/provider validation still pending; manual location remains available |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Existing optional provider; key present locally, local fallback remains available |
| `PYTHON_VERSION` | Optional Render runtime override; unnecessary with the version file, and must not conflict with it |
| `SSL_CERT_FILE` | Conditional database CA file path; absent; needed only if provider trust requires it |
| `GEOCODER_URL`, `GEOCODER_USER_AGENT`, `GEOCODER_ALLOW_PUBLIC_NOMINATIM` | Optional reverse-geocoding configuration |
| `EVIDENCE_MAX_BYTES`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `OTP_EXPIRE_MINUTES` | Existing optional limits/settings with defaults |
| `VERIFICATION_WINDOW_HOURS`, `VERIFICATION_QUORUM_PERCENT`, `STAFF_REQUIRE_VERIFIED_EMAIL` | Existing workflow/email-policy settings with defaults |
| `APP_NAME`, `DUPLICATE_THRESHOLD`, `DUPLICATE_LOOKBACK_DAYS`, `DUPLICATE_CANDIDATE_LIMIT` | Existing optional application settings |
| `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_LOGIN`, `RATE_LIMIT_REGISTER`, `RATE_LIMIT_FORGOT`, `RATE_LIMIT_VERIFY`, `RATE_LIMIT_INTELLIGENCE` | Existing optional per-process limits |

`DATABASE_URL`, `JWT_SECRET`, production mode and CORS settings are process-environment settings; storing them only in backend .env does not configure them. In particular, a local JWT setting exists in .env but is not consumed; the current development secret is process-local. Production requires a stable secret of at least 32 characters. Authentication uses backend bearer JWTs, Argon2 password hashes and database role/scope checks; the frontend stores its token in sessionStorage.

Disabled/demo/future switches `ENABLE_DEMO_IDENTITY`, `ENABLE_TRAINED_ML`, `ML_ARTIFACT_DIR`, `BHASHINI_ENABLED`, `DIGILOCKER_ENABLED`, `DIGILOCKER_CLIENT_ID`, `DIGILOCKER_CLIENT_SECRET`, `AADHAAR_OFFLINE_ENABLED` are not deployment prerequisites. `VITE_TURNSTILE_SITE_KEY` appears in an unused component and is not needed by current auth forms. Do not enable new integrations as part of this deployment.

Database persistence is verified **locally only**. The effective database is `backend/nagriksetu.db`; read-only checks found 12 tables, Alembic head `0006_identity`, a successful integrity check and zero foreign-key violations. Existing database and backups were preserved.

For Render, choose either externally persistent PostgreSQL via the existing pg8000/TLS integration, or a paid Render persistent disk. PostgreSQL credentials and migrations have not been verified live because the process database setting is absent. For Supabase on an IPv4 network, use its session pooler or an IPv4-enabled connection and copy the exact connection details privately from its dashboard. See [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres). Selecting PostgreSQL creates/uses that database; it does not copy local SQLite records or local staff accounts. If retaining SQLite, mount a paid disk at `/var/data` and point the database URL at `sqlite:////var/data/nagriksetu.db`; do not rely on the fallback path in the code directory. Securely transfer a consistent backup separately only if retaining existing records is desired and authorized. Free Render services cannot attach persistent disks. Sources: [Render disks](https://render.com/docs/disks), [free service limitations](https://render.com/docs/free).

Supabase Storage is separate from the SQL database. Uploads use a private bucket, randomized object paths, JPEG/PNG/WebP validation, a default 10 MiB size limit, scope checks and five-minute signed URLs. There is no local upload fallback; unavailable storage returns 503. Read-only checks confirmed adapter configuration but the configured project hostname fails DNS while public DNS controls resolve. Privately verify the project endpoint and availability, then verify the private bucket and upload/access/cleanup with approval. No storage HTTP operation or upload was performed in this audit.

Validation completed:

- Backend: Python 3.13.15, dependency `pip check` passes; **157 existing tests pass**, no failures. Existing Alembic Column.copy deprecation warnings remain.
- Production-mode app import, temporary-database migrations, OpenAPI and all health endpoints pass; configured CORS preflight passes and an unlisted origin is rejected.
- Existing real HTTP frontend-service smoke passes across registration/login, roles, complaint creation, assignment/status, resolution/verification, notifications and analytics, using disposable SQLite. The final smoke disabled optional external providers. An earlier attempt picked up local optional email configuration and failed delivery; successful Brevo delivery is not established.
- Frontend: Vite 8.3.2 production build passes, 1,956 modules; lint passes with 21 existing warnings; API unit test passes 1/1; installed dependency tree passes.
- Build-tested map worker is self-contained; the previous missing sibling import is eliminated. Production placeholder backend configuration appears in the audit build and the loopback API origin does not.
- Fresh isolated lockfile installation passes (`npm ci`, 72 packages), followed by a successful fixed production build, API test and lint check. No local environment files were copied into either build directory.
- No live Render/Vercel build or browser check was performed. Audit builds use placeholders and are verification artifacts, not deployable production bundles.

Remaining blockers are: (1) review and publish the exact working backend/frontend source after approval; (2) select and verify persistent database configuration; (3) provision production environment settings and final frontend/backend origins; (4) correct the Supabase endpoint and validate private uploads to preserve the full prototype; (5) verify Brevo delivery if retaining recovery/verification flows; (6) provision intended staff accounts in the selected cloud database, or securely preserve them with existing data. No redesign or additional AI feature is included.

Files changed by this task:

| File | Change |
|---|---|
| `backend/.python-version` | Added tested Python runtime pin |
| `C:\NagrikSetuFrontend\frontend\vercel.json` | Added SPA route-refresh rewrite |
| `C:\NagrikSetuFrontend\frontend\src\components\common\LocationPicker.jsx` | Changed one worker import to the bundled production worker |
| `DEPLOYMENT_READINESS.md` | Added this report |

All 124 pre-existing backend files in the baseline remain byte-identical, including ignored configuration/database files. Of 72 recorded frontend source/config files, only the expected one-line worker import changed; it matches the build-tested copy. No credentials were printed, changed or committed. The separate workspace `deployment-audit` directory holds isolated source/build/install checks, SHA256 manifests and the read-only GitHub frontend checkout. It is outside the backend Git repository and must not be included in a source commit.

