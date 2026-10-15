# Frontend and backend integration review

The integrated application starts from the current local prototype published as
`b48f9aa`. It was compared with Asmit's `frontend` branch at `331a32f`, the
`backend-prashasti` source at `36a1de6` plus its preserved working files, and the
current local frontend. The original teammate branches and working folders are
retained. Integration fixes are made on `deploy/nagriksetu-prototype` for a
reviewed pull request into `main`; no branch is reset or force-pushed.

The initial 74 frontend files matched the current local frontend exactly. All
119 backend source files matched the preserved backend working snapshot. The
final changes below restore useful original frontend behavior while retaining
the newer API integration. Asmit's original category examples and visual
components remain the source of the restored guidance; no older branch was
blindly copied over the integrated frontend.

| Area | Final implementation |
|---|---|
| Navigation | Original pages remain reachable. Desktop My Complaints and the account menu work again; real session/role guards remain. |
| Complaint detail | Live complaint, timeline, assignment and evidence APIs remain. Print Summary again invokes browser printing for the loaded record. |
| Category directory | Live department IDs/names and newly configured departments remain authoritative. Original common-report guidance, keyword search, icons and grouped filters are retained alongside individual department filters. Report links submit the live category name. |
| Registration | Real citizen registration/login, password confirmation and backend password policy remain. Optional phone collection uses the existing backend field. A responsible-use checkbox restores the original acknowledgement interaction without inventing legal documents or identity-verification guarantees. |
| Profile | Name/phone use the real backend. Address/city are restored as explicitly browser-local, account-scoped preferences. Email stays tied to the authenticated backend account and its real verification flow. |
| Local preferences | Existing language/email/resolution/digest preferences remain. The original SMS/WhatsApp preference toggle is retained as local-only; neither branch implemented SMS delivery. |
| Recovery and OTP | Backend purpose-isolated email OTP/reset-token flows replace fixed demo OTPs and no-op password changes. No client-selected staff role, local password store or unconditional verification badge is restored. |
| Citizen workflows | Guarded reporting, GPS/manual location, private upload endpoints, personal lists, tracking/detail, timeline, resolution verification and reopening remain connected to the backend. |
| Authority/admin | Department/officer-scoped dashboards, assignment/status/remarks/resolution, verification queue, analytics, notifications, and authorized department/staff provisioning remain. Old inert actions and fixture statistics are not represented as live work. |
| Help and language | The existing backend help/status API, draft handoff, image preview and manual report path remain. Voice/BHASHINI/external translation availability is unchanged and explicitly unavailable until configured/approved; no new AI feature is introduced. |
| Backend and deployment | Models, six Alembic migrations, API routes, existing AI/ML source, email/storage adapters, Python pin, API configuration, worker fix and Vercel SPA rewrite are preserved. |

Legacy signup ward data was written to a registration object that no login,
profile or report workflow read. Old profile email editing changed only a local
display object; it did not change an authenticated account. Demo authority
selection, fixed OTPs, static identity badges, fixture response metrics and
unimplemented provider buttons are not working backend features to restore.
Keeping them would misrepresent identity, permissions or provider availability.

The original 23 literal frontend routes remain present or have guarded
compatibility redirects; the integrated application has additional explicit
citizen, authority/admin and email-verification routes. No working original
route was removed. Shared detail/map components replace duplicated older pages.
Static AuthorityFooter/StatsSection files were presentation/fixture components,
not separate operational pages or data sources.

Focused regression tests cover original guidance/search with live/custom
department IDs and account-isolated local profile storage, including malformed
or unavailable storage and rejection of authentication fields. The real HTTP
smoke also verifies phone persistence through registration/login. Existing API,
role, migration, workflow, provider-fallback and ML tests remain intact.

Validation commands:

```sh
# backend, with requirements-dev.txt and pytest installed in a fresh environment
python -m pip check
python -m unittest discover -s tests -v
python -m pytest -q -p no:cacheprovider tests

# frontend
npm ci
npm test
npm run lint
npm run build
```

The HTTP smoke uses the existing `backend/tests/run_frontend_smoke.py` against
this repository's frontend with disposable SQLite and external providers disabled.
Browser end-to-end checks must be reported separately; passing API/build tests
does not imply that a real browser or deployed public URLs were tested.

The Git index and tracked source are scanned before committing. Local environment
files, credentials, SQLite/backups, dependencies, builds, virtual environments
and user documents remain excluded. Example environment templates contain no
actual credentials.

Cloud deployment is a separate gate. Use persistent PostgreSQL with verified TLS
and reviewed migrations, configure rotated replacement secrets directly in
provider settings, correct the Supabase project endpoint/private bucket, and set
the final API origin/CORS before live use. No paid resource is created without
approval. A successful GitHub merge does not mean that the website is live.
