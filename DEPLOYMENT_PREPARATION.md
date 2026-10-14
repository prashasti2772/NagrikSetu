# NagrikSetu prototype deployment source - 14 October 2026

The combined prototype is prepared on `deploy/nagriksetu-prototype`, based on
`backend-prashasti` at `36a1de6535a54570b72369c4049632074aee6a08` plus the
validated local backend working files. Both hosting projects should select this
deployment branch after its publication is approved.

The repository has two deployment roots:

```text
backend/   FastAPI application, migrations, runtime dependencies and tests
frontend/  Current Vite/React application, API service, auth guards and tests
```

The frontend was copied from `C:\NagrikSetuFrontend\frontend`, not from the
older GitHub `frontend` branch. Its 74 source/config files preserve the tested
API integration, authentication, role guards, map worker fix and `vercel.json`.
The backend is a snapshot of the current tested local work, including existing
uncommitted service/test/ML helper dependencies. No additional AI/ML feature was
implemented. ML data/artifact directories contain only source placeholders.

The original backend working tree and branch, local frontend and existing
GitHub `backend-prashasti`, `frontend` and `main` branches are preserved. The
deployment worktree is separate from the original checkout. Local environment
files, credentials, databases, virtual environments, dependencies, generated
builds and editor scratch files are excluded. Only safe `.env.example` templates
are included. Repository ignore rules cover both deployment roots.

Render settings for this branch:

| Setting | Value |
|---|---|
| Branch | `deploy/nagriksetu-prototype` |
| Root directory | `backend` |
| Runtime | Python 3.13.15, pinned in `.python-version` |
| Build | `python -m pip install -r requirements.txt` |
| Start | `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1` |
| Health check | `/health/ready` |

Vercel settings for the same branch:

| Setting | Value |
|---|---|
| Branch | `deploy/nagriksetu-prototype` |
| Root directory | `frontend` |
| Framework / Node | Vite / 24.x |
| Install | `npm ci` |
| Build | `npm run build` |
| Output directory | `dist` |

Use the HTTPS backend origin for `VITE_API_BASE_URL`; the API service adds
`/api/v1`. Configure the final frontend origins in `CORS_ORIGINS`. Validation
builds use a nonsecret placeholder and are not production deployment bundles.

Git source preparation does not resolve the remaining hosting configuration
blockers: persistent cloud database selection/connectivity, production
environment settings, the configured Supabase Storage endpoint's DNS failure,
live upload/email checks, and intended staff provisioning. Selecting PostgreSQL
does not transfer existing local SQLite data. The earlier
`DEPLOYMENT_READINESS.md` records these findings; its original branch settings
are superseded by this document's combined deployment branch.

Before committing, scan Git index contents for known local credential values,
common token/private-key patterns, authenticated URLs and forbidden file paths.
Review any synthetic test-fixture matches without publishing matched values.
Validation should cover backend unit tests, a fresh frontend installation and
production build, the existing frontend API test/lint, and the real HTTP
frontend-to-backend smoke with disposable SQLite and external providers disabled.

After the local commit is reviewed and the user approves pushing, publish from
the deployment worktree. Stop if the working tree is dirty, the branch is not
the deployment branch, the remote query fails, or the remote deployment branch
already exists:

```powershell
Set-Location 'C:\Users\Asus\OneDrive\Desktop\NagrikSetu\deployment-preparation'
$deploymentRepo = 'C:/Users/Asus/OneDrive/Desktop/NagrikSetu/deployment-preparation'
$deploymentBranch = git -c safe.directory=$deploymentRepo branch --show-current
if ($LASTEXITCODE -ne 0 -or $deploymentBranch -ne 'deploy/nagriksetu-prototype') {
    throw 'Unexpected branch; stop before publishing'
}
$deploymentChanges = @(git -c safe.directory=$deploymentRepo status --porcelain)
if ($LASTEXITCODE -ne 0 -or $deploymentChanges.Count -ne 0) {
    throw 'Working tree is not clean; stop before publishing'
}
$deploymentRemoteRef = @(git -c safe.directory=$deploymentRepo ls-remote --heads origin refs/heads/deploy/nagriksetu-prototype)
if ($LASTEXITCODE -ne 0 -or $deploymentRemoteRef.Count -ne 0) {
    throw 'Remote query failed or deployment branch already exists; stop'
}
git -c safe.directory=$deploymentRepo push --set-upstream origin HEAD:refs/heads/deploy/nagriksetu-prototype
```

This publishes only the separate branch. It performs no merge or deployment and
uses no force option. No push is authorized by the preparation task alone.
