# NagrikSetu

For the 27 October 2026 Anveshana demo, use the current
[Render and Supabase readiness report](HACKATHON_READINESS.md).

NagrikSetu supports citizen civic issue reporting, intelligent routing, transparent
tracking, and community-verified resolution. Citizens report local issues and
track progress; authorities manage assignments and repairs; the reporting citizen
confirms whether a proposed resolution fixed the issue.

The backend provides authentication and role-based access, complaint timelines,
department and officer management, dashboards, analytics, notifications, and
evidence metadata. Local text analysis suggests categories, departments, priority,
and possible duplicates, while a local help chatbot explains the workflow. These
are supporting features that leave decisions with users and staff; they do not
claim production accuracy or live government integration.

Development uses SQLite. Production requires a verified persistent PostgreSQL
database, rotated credentials configured in provider secrets, and a reachable
private Supabase evidence bucket. Cloud deployment and real public URLs remain
separate from repository integration. Local complaint analysis and FAQ fallback
do not require external API credentials.

- [Backend setup and SQLite validation](backend/README.md)
- [Frontend API contract](backend/API_CONTRACT.md)
- [React frontend handoff](backend/FRONTEND_HANDOFF.md)
- [Current React application and setup](frontend/README.md)
- [Integration review and teammate contribution preservation](INTEGRATION_REVIEW.md)
- [Database, provider and staff operations](backend/OPERATIONS_RUNBOOK.md)

For local frontend integration, use `VITE_API_BASE_URL=http://127.0.0.1:8000` and
the full `/api/v1/...` paths in the contract. The backend permits both Vite default
origins (`localhost:5173` and `127.0.0.1:5173`) through configurable CORS settings.

From `frontend/`, run `npm ci`, `npm test`, `npm run lint` and `npm run build`.
From `backend/`, install `requirements-dev.txt` and run
`python -m unittest discover -s tests -v`; the suite also runs with pytest when
pytest is installed. Tests use temporary SQLite. Keep local `.env`, databases,
backups, virtual environments, dependencies and generated builds out of Git.

After the local readiness corrections are approved and published, configure both Render services from `main`:

| Hosting | Root | Build | Start / output |
|---|---|---|---|
| Render, Python 3.13.15 | `backend` | `python -m pip install -r requirements.txt` | `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1` |
| Render Static Site, Node 24.16.0 | `frontend` | `npm ci && npm run build` | `dist` |

Render health check: `/health/ready`. Production must report PostgreSQL connected.
With `APP_ENV=production`, startup refuses a missing PostgreSQL URL, disabled TLS,
an unstable JWT secret, or missing exact HTTPS frontend CORS origins.
Set `VITE_API_BASE_URL` to the backend HTTPS origin before building and set backend
`CORS_ORIGINS` to the exact frontend origin. Never expose backend credentials as
`VITE_*`. Production frontend builds require a public HTTPS API origin. Add the
Static Site rewrite `/*` to `/index.html`; `render.yaml` records both service settings.
Existing readiness/preparation reports describe earlier phases; they
do not establish a live deployment or override these production gates.
