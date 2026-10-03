# NagrikSetu frontend API contract

## Connection and shared conventions

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The base URL has no trailing slash or `/api/v1` suffix. Every endpoint below uses
its full path. For example, fetch
`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/me`.
Send `Content-Type: application/json` for JSON bodies and
`Authorization: Bearer <access_token>` for protected routes. Obtain tokens through
login; never put tokens, database credentials, or signing secrets in frontend
configuration. Roles are `citizen`, `authority`, and `admin`; the backend checks
them on every request. Public signup always creates a citizen.

CORS defaults allow `http://localhost:5173` and `http://127.0.0.1:5173`. Override
the backend's comma-separated `CORS_ORIGINS` environment variable when needed.
Bearer authentication does not require cookie credentials.

Responses are JSON objects or arrays, without a `data` wrapper. Paginated lists
accept `offset` (default 0, minimum 0) and `limit` (default 20, range 1-100), returning
arrays without a total-count envelope. Success is HTTP 200 unless stated otherwise.
Example IDs must be replaced with IDs from your database. All example identities,
passwords, and reset values are fictional; no example account exists by default.

Typical failures use `{"detail":"Explanation"}`. HTTP 422 returns a validation
`detail` array or a business-validation string. 401 means missing/expired/invalid
login or an inactive account; 403 means insufficient role or complaint scope; 404
means missing resource; 409 means existing-data or workflow conflict. Limited
endpoints return 429 with `Retry-After`. Dates/times are UTC ISO 8601 strings;
complaint creation/update timestamps include an offset, while older response
schemas can serialize UTC without an offset. Treat these unmarked timestamps as UTC.

### Shared response objects

- **User**: `id`, `full_name`, `email`, `phone`, `role`, `is_active`, `employee_id`,
    `email_verified`, `designation`, `department_id`, `created_at`, `updated_at`. Staff fields may be
  null. No password/hash or signing secret is returned.
- **Complaint**: `id`, `title`, `description`, `category`, `severity`, `priority`,
    `latitude`, `longitude`, `address`, `location_accuracy_m`, `locality`, `area`, `ward`,
    `image_url`, `status`, `citizen_id`, `incident_id`,
  `assigned_department` (legacy name), `assigned_department_id`,
  `assigned_officer_id`, `resolution_notes`, `evidence_url`, `resolved_at`,
  `verification_status`, `created_at`, `updated_at`. Ownership, assignment,
  evidence, and resolution fields can be null for old/unassigned reports.
- **Department**: `id`, `name`, `description` (nullable), `is_active`.
- **StatusCounts**: `submitted`, `under_review`, `assigned`, `in_progress`,
  `verification_pending`, `resolved`, `reopened`, and `total`, all integers.
- **History**: `id`, `complaint_id`, `old_status` (nullable), `new_status`,
  `changed_by_user_id` (nullable), `remarks` (nullable), `created_at`, `action`,
  `verification_status` (nullable), `old_department_id`, `new_department_id`,
  `old_officer_id`, `new_officer_id` (all nullable). Assignment events preserve the
  before/after IDs. Citizen verification events preserve the decision, feedback,
  actor and timestamp. Older migrated rows have action `legacy` and no invented
  assignment/verification snapshots.
- **Evidence**: `id`, `complaint_id`, `image_url`, `evidence_type`, `uploaded_at`,
    `uploaded_by` (nullable for legacy records), `content_type`, `size_bytes`. Private
    storage object paths and bucket names are never returned.
- **Incident**: shared workflow status/assignment/resolution plus aggregate
    `report_count`, distinct `reporting_citizens`, `approvals`, and `rejections`.
    Complaint reports remain separate records.
- **Notification**: `id`, `user_id`, `title`, `message`, `type`, `is_read`,
  `complaint_id` (nullable), `created_at`.

Severity and priority values: `low`, `medium`, `high`, `critical`. Complaint statuses
are the seven StatusCounts names above. Verification status: `pending`, `approved`,
`rejected`, `reopened`.

An **in-scope authority** belongs to the complaint's department or is its explicitly
assigned officer. Admins have global access. Citizens access only their own reports.
Scope applies to details, listing, timeline, evidence, analytics, duplicate
suggestions, and chatbot lookups.

### Service checks

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/` | No / public | No body | `message`, `docs`, `health` | None expected |
| GET | `/health` | No / public | No body | `{"status":"ok"}` | None expected |
| GET | `/health/db` | No / public | No body | `{"status":"ok","database":"connected"}` | 503 database unavailable |

Interactive reference: `GET /docs`. Machine-readable schema: `GET /openapi.json`.

## AUTH

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | No / public; creates citizen | `{"full_name":"Asha Rao","email":"asha@example.com","password":"ExampleOnly!482","phone":"9000000000"}` | 201, User; sends a purpose-scoped verification OTP when Brevo is configured | 409 email exists; 422 invalid fields; 429 |
| POST | `/api/v1/auth/login` | No / any active account | `{"email":"asha@example.com","password":"ExampleOnly!482"}` | `access_token`, `token_type` (`bearer`) | 401 invalid credentials/inactive account; 422; 429 |
| GET | `/api/v1/auth/me` | Yes / citizen, authority, admin | No body | Current User | 401 |
| PATCH | `/api/v1/auth/me` | Yes / citizen, authority, admin | `{"full_name":"Asha Rao","phone":"9000000000"}`; either field may be omitted, `phone` may be null | Updated User; only `full_name` and `phone` are editable | 401; 422 empty/invalid/unsupported fields |
| POST | `/api/v1/auth/forgot-password` | No / public | `{"email":"asha@example.com"}` | Generic `message` regardless of account eligibility | 422; 429; 503 email delivery unavailable outside development |
| POST | `/api/v1/auth/verify-otp` | No / public | `{"email":"asha@example.com","otp":"123456"}` | `reset_token` | 400 invalid/expired/used code; 422; 429 |
| POST | `/api/v1/auth/reset-password` | No / valid reset token required | `{"reset_token":"replace-with-returned-reset-token","new_password":"ExampleOnly!927"}` | `{"message":"Password updated"}` | 400 invalid/expired/used reset token; 422; 429 |
| POST | `/api/v1/auth/request-email-verification` | Yes / citizen, authority, admin | No body; current account only | Generic `message`; code sent via Brevo if configured | 401; 429; 503 |
| POST | `/api/v1/auth/verify-email` | Yes / citizen, authority, admin | `{"otp":"123456"}` | `email_verified: true` | 400 invalid/expired/used code; 401; 422; 429 |

Registration/reset passwords need 10-128 characters. Registration accepts only
`full_name`, `email`, `password`, and optional `phone`; `role` is rejected. Emails
are normalized to lowercase. All roles share login; `/auth/me` identifies the role.

OTP codes contain six digits, expire by default after ten minutes, allow five
verification attempts, and can be verified once. Issuance has a 60-second per-email,
per-purpose cooldown. Brevo REST delivery is optional; registration sends an email
verification OTP when configured. Without Brevo, local development does not send or
log OTP codes; tests inject a fake delivery. OTP values never appear in API responses
or logs. Outside development, security email actions return 503 until Brevo settings
are configured. Password reset invalidates existing access tokens; log in again.
There is no refresh-token API or forced first-login password-change flow yet.

## CITIZEN

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/departments` | No / public | No body | Array of active Department objects | None expected |
| POST | `/api/v1/complaints` | Yes / citizen | `{"title":"Pothole near the bus stop","description":"A deep pothole is damaging vehicles near the main bus stop.","category":"Roads & Infrastructure","severity":"medium","latitude":19.076,"longitude":72.8777,"location_accuracy_m":8,"location_text":"Main Road bus stop","locality":"Central","area":"Market","ward":"Ward 4"}` | 201, individual Complaint with its own `incident_id`; owner from token; `same_incident_candidates` are suggestions only | 401; 403 wrong role; 422 |
| GET | `/api/v1/users/me/complaints` | Yes / citizen | No body; query example `?offset=0&limit=20` | Array of own Complaint objects, newest ID first | 401; 403; 422 |
| GET | `/api/v1/users/me/dashboard` | Yes / citizen | No body | StatusCounts plus `submitted_under_review` | 401; 403 |
| GET | `/api/v1/complaints` | Yes / citizen, authority, admin | No body; query example `?offset=0&limit=20` | Array of Complaint objects restricted to caller scope | 401; 422 |
| GET | `/api/v1/complaints/{complaint_id}` | Yes / owner citizen, in-scope authority, admin | No body | Complaint | 401; 403; 404; 422 |
| GET | `/api/v1/complaints/{complaint_id}/timeline` | Yes / owner citizen, in-scope authority, admin | No body | Array of History objects, oldest first, including remarks/workflow events | 401; 403; 404; 422 |
| POST | `/api/v1/complaints/{complaint_id}/verify` | Yes / owner citizen | `{"resolved":true,"feedback":"The pothole has been repaired."}` | Complaint: `status=resolved`, `verification_status=approved`; rejection described below | 401; 403; 404; 409 not awaiting verification; 422 |
| GET | `/api/v1/complaints/{complaint_id}/evidence` | Yes / owner citizen, in-scope authority, admin | No body | Array of Evidence objects, oldest first | 401; 403; 404; 422 |
| POST | `/api/v1/complaints/{complaint_id}/evidence` | Yes / owner citizen, in-scope authority, admin | `{"image_url":"https://example.com/follow-up.jpg","evidence_type":"supporting"}` | 201, Evidence | 401; 403 scope/citizen resolution evidence; 404; 422 |
| POST | `/api/v1/complaints/{complaint_id}/evidence/upload` | Yes / owner citizen, in-scope authority, admin | Multipart `file` (JPEG/PNG/WebP, <= configured limit), optional `evidence_type` | 201 Evidence metadata; private bucket/object identifiers omitted | 401; 403; 413; 415/422; 503 |
| GET | `/api/v1/complaints/{complaint_id}/evidence/{evidence_id}/access` | Yes / owner citizen, in-scope authority, admin | No body | Private `signed_url`, `expires_in` (300 seconds), `Cache-Control: no-store` | 401; 403; 404; 409 legacy URL; 503 |
| GET | `/api/v1/complaints/{complaint_id}/incident` | Yes / owner citizen, in-scope authority, admin | No body | Aggregate Incident counts/status; no other reporter data | 401; 403; 404 |
| GET | `/api/v1/notifications` | Yes / citizen, authority, admin; own records | No body; query example `?is_read=false&offset=0&limit=20` | Array of Notification objects, newest ID first | 401; 422 |
| PATCH | `/api/v1/notifications/{notification_id}/read` | Yes / notification owner, any role | No body | Notification with `is_read=true` | 401; 404 missing/not owned; 422 |
| PATCH | `/api/v1/notifications/read-all` | Yes / citizen, authority, admin; own records | No body | `updated` count | 401 |

Creation requires title (1-200 characters), description (1-10,000), and category
(1-100). Location is optional. If either coordinate is supplied, both finite latitude
(-90..90) and longitude (-180..180) are required. `location_accuracy_m` is optional
(0..100,000); `location_text` is an alias for `address`; optional `locality`, `area`,
and `ward` accept 1-100 characters. `severity` defaults to `medium`. Optional
nullable `image_url` is an HTTP(S) URL, maximum 2,048 characters. Optional legacy
`assigned_department` text does not grant an assignment; staff route by IDs.

Suggested categories match seeded department names: Roads & Infrastructure,
Sanitation, Water Supply, Street Lighting, Drainage, Parks & Gardens,
Traffic & Parking, Public Safety, Animal Welfare, Environment, Other. Category is
currently text, not a closed enum. Fetch department IDs instead of hardcoding them.

To reject a proposed resolution, send
`{"resolved":false,"feedback":"The pothole is still present."}` to `/verify`.
It becomes `status=reopened`, `verification_status=rejected`. Only a
`verification_pending` complaint can be verified. Citizens cannot directly change
status or reopen an accepted resolution; scoped staff can reopen it.

Evidence can be legacy/external HTTP(S) URL metadata or a private uploaded object.
The upload endpoint accepts JPEG/PNG/WebP only, defaults to a 10 MiB maximum, ignores
client filenames, and stores randomized object names in a private bucket. Signed
access links expire after five minutes. Without valid Supabase Storage configuration,
uploads return 503 while complaint reporting and URL metadata remain usable. No URL
is fetched. `evidence_type` is `report`, `resolution`, or `supporting` (default);
citizens cannot submit `resolution` evidence. Resolution evidence is shared as
metadata across reports linked to the same incident.

## AUTHORITY

Every endpoint here requires authority/admin authentication. Authority data stays
within department/officer scope; admins can initially route unassigned complaints
and transfer departments. Timeline, evidence, and notification endpoints in CITIZEN
also support scoped staff.

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/authority/dashboard` | Yes / authority, admin | No body | StatusCounts plus up to ten `recent_complaints` by latest update | 401; 403 |
| GET | `/api/v1/authority/complaints` | Yes / authority, admin | No body; query example `?status=assigned&department=1&priority=high&offset=0&limit=20` | Array of scoped Complaint objects, newest ID first | 401; 403; 422 |
| GET | `/api/v1/authority/complaints/{complaint_id}` | Yes / in-scope authority, admin | No body | Complaint | 401; 403; 404; 422 |
| GET | `/api/v1/authority/officers` | Yes / authority, admin | No body; query example `?is_active=true` | Array of authority User objects by name/ID | 401; 403 another department; 422 |
| PATCH | `/api/v1/authority/complaints/{complaint_id}/assign` | Yes / in-scope authority, admin | `{"assigned_department_id":1,"assigned_officer_id":7,"priority":"high"}` | Complaint with updated assignment; normally `status=assigned` | 401; 403 scope/department transfer; 404; 409 resolved/verification pending; 422 invalid/empty update |
| PATCH | `/api/v1/authority/complaints/{complaint_id}/status` | Yes / in-scope authority, admin | `{"status":"in_progress"}` | Complaint; timeline event persisted | 401; 403; 404; 409 transition/assignment conflict; 422 |
| PATCH | `/api/v1/complaints/{complaint_id}/status` | Yes / in-scope authority, admin | `{"status":"under_review"}` | Complaint; compatibility route with the same transition rules | 401; 403; 404; 409; 422 |
| POST | `/api/v1/authority/complaints/{complaint_id}/remarks` | Yes / in-scope authority, admin | `{"text":"Inspection completed; repair crew scheduled."}` | 201, `id`, `complaint_id`, `author_user_id`, `text`, `created_at`; also in timeline | 401; 403; 404; 422 |
| POST | `/api/v1/authority/complaints/{complaint_id}/resolve` | Yes / in-scope authority, admin | `{"resolution_notes":"Pothole filled and surface levelled.","evidence_url":"https://example.com/resolution.jpg"}` | Complaint and linked reports: `status=verification_pending`; resolution evidence is shared as per-report metadata | 401; 403; 404; 409 invalid current state; 422 |
| POST | `/api/v1/authority/complaints/{complaint_id}/reopen` | Yes / in-scope authority, admin | No body | Complaint: `status=reopened`, `verification_status=reopened`, `resolved_at=null` | 401; 403; 404; 409 not resolved/verification pending; 422 |
| GET | `/api/v1/authority/incidents` | Yes / authority, admin | Optional `status`, `offset`, `limit` | Scoped Incident aggregates | 401; 403; 422 |
| GET | `/api/v1/authority/complaints/{complaint_id}/incident-candidates` | Yes / in-scope authority, admin | No body | Candidate `incident_id`, similarity, approximate distance, reason; no other report IDs/text | 401; 403; 404 |
| POST | `/api/v1/authority/complaints/{complaint_id}/incident` | Yes / in-scope authority, admin | `{"incident_id":12,"reason":"Same damaged road section and nearby location confirmed."}` | Updated individual Complaint with shared `incident_id` | 401; 403; 404; 409 invalid/empty target; 422 |
| GET | `/api/v1/authority/analytics/summary` | Yes / authority, admin | No body; optional date query below | StatusCounts, `average_resolution_hours` (nullable), `resolution_sample_count` | 401; 403; 422 |
| GET | `/api/v1/authority/analytics/categories` | Yes / authority, admin | No body; optional date query | Array of `category`, `total` | 401; 403; 422 |
| GET | `/api/v1/authority/analytics/departments` | Yes / authority, admin | No body; optional date query | Array of `department_id` (nullable), `department`, `total`; missing is `Unassigned` | 401; 403; 422 |
| GET | `/api/v1/authority/analytics/priorities` | Yes / authority, admin | No body; optional date query | Array of `priority`, `total` | 401; 403; 422 |
| GET | `/api/v1/authority/analytics/recent` | Yes / authority, admin | No body; optional date query and `limit=10` | Array of Complaint objects by latest creation; limit 1-100, default 10 | 401; 403; 422 |
| GET | `/api/v1/authority/analytics/trends` | Yes / authority, admin | No body; optional date query | Array of `date` (`YYYY-MM-DD`), `total`; only dates with records | 401; 403; 422 |

Complaint filters: `status`, `category` (exact text), `priority`, `department`
(positive ID), `assigned_officer` (positive ID), `location` or `area` (address
substring), `offset`, `limit`. If both location/area are supplied, area wins.
Filters never broaden authority scope.
The persisted verification queue is the same list with `?status=verification_pending`.

Each citizen POST creates a separate complaint report and a separate incident by
default. Candidate matches use local text similarity, compatible category, a recent
open workflow window, and Haversine distance when both locations are supplied. The
create response exposes only suggested incident IDs/scores/reasons, not another
complaint ID or text. There is no automatic merge. Staff must explicitly confirm a
link with the incident POST above. Linking preserves both complaint IDs and their
individual histories/evidence. The former incident is removed only if it has no
remaining reports.

Assignment, progress, remarks, and resolution submitted on any member report update
the shared incident and sibling report workflow. On resolution, each distinct
reporting citizen must approve for the shared incident to become `resolved`; any
citizen rejection reopens the incident. A citizen sees aggregate incident counts but
not other reporters' names, report text, IDs, or verification feedback.

Authority officer listing defaults to `is_active=true`. Authorities list their
own department; admins can supply `department=<id>` or omit it for all departments.
Use `/admin/officers` for workload fields.

Assignment accepts at least one field. Explicit null clears a department/officer;
omitted fields retain their values. Officers must be active and in the selected
active department. For department transfers, replace or clear an incompatible
officer. Assignment creates history. Direct status transitions are:

| Current status | Allowed next status |
| --- | --- |
| `submitted` | `under_review`, `assigned` |
| `under_review` | `assigned`, `in_progress` |
| `assigned` | `under_review`, `in_progress` |
| `in_progress` | `under_review` |
| `reopened` | `under_review`, `assigned`, `in_progress` |

`assigned` requires department/officer assignment. Use `/resolve` from
`under_review`, `assigned`, `in_progress`, or `reopened`. Direct status PATCH cannot
set `resolved` or bypass citizen verification.

All analytics accept inclusive UTC complaint-creation dates, for example
`?date_from=2026-10-01&date_to=2026-10-31`. Invalid/reversed ranges return 422.
Resolution hours count currently citizen-confirmed resolved reports from creation
to staff resolution submission, excluding citizen confirmation delay. No samples
means null average and sample count 0.

## ADMIN

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/users` | Yes / admin | No body; query example `?role=authority&department=1&is_active=true&offset=0&limit=20` | Array of User objects | 401; 403; 422 |
| GET | `/api/v1/admin/users/{user_id}` | Yes / admin | No body | User | 401; 403; 404; 422 |
| POST | `/api/v1/admin/authorities` | Yes / admin | `{"full_name":"Ravi Shah","email":"officer@example.com","employee_id":"OFF-007","designation":"Field Officer","department_id":1,"temporary_password":"ExampleOnly!638"}` | 201, authority User; no password returned | 401; 403; 409 duplicate email; 422 invalid department/input |
| PATCH | `/api/v1/admin/users/{user_id}` | Yes / admin | `{"designation":"Senior Field Officer","is_active":true}` | Updated User | 401; 403; 404; 409 active assignments/self-deactivation; 422 |
| GET | `/api/v1/admin/officers` | Yes / admin | No body; query example `?department=1&is_active=true&offset=0&limit=20` | Array of User fields plus `department`, `active_assignments`, `resolved_complaints`, `current_status` | 401; 403; 422 |
| GET | `/api/v1/admin/departments` | Yes / admin | No body; optional `?is_active=false` | All departments, including inactive; filter omitted returns all | 401; 403; 422 |
| POST | `/api/v1/admin/departments` | Yes / admin | `{"name":"Ward Maintenance","description":"Coordinates local maintenance reports.","is_active":true}` | 201, Department | 401; 403; 409 duplicate name; 422 |
| PATCH | `/api/v1/admin/departments/{department_id}` | Yes / admin | `{"description":"Coordinates ward maintenance and inspection.","is_active":true}` | Updated Department | 401; 403; 404; 409 duplicate name; 422 |

User filters: `role`, `department`, `is_active`, `search` (name/email/employee ID
substring, maximum 200 characters), `offset`, `limit`. Officer filters: `department`,
`is_active`, `offset`, `limit`. Officer `current_status` is `inactive`, `busy`, or
`available`; workload follows current assignment, not historical attribution.

User PATCH allows only `department_id`, `designation`, `is_active`, with at least
one field. Authorities require an active department; citizens cannot receive staff
departments. Reassign active complaints (including verification pending) before
transferring/deactivating an officer. Admins cannot deactivate themselves.
Access-changing edits invalidate prior tokens. There is no public staff signup or
API for promoting a citizen to admin.

## ML / INTELLIGENCE

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/intelligence/analyze-complaint` | Yes / citizen, authority, admin | `{"title":"Pothole near the bus stop","description":"A deep pothole is damaging vehicles near the main bus stop.","category":"Roads & Infrastructure","address":"Main Road bus stop","latitude":19.076,"longitude":72.8777}` | Analysis object below; suggestions only | 401; 422; 429 |
| GET | `/api/v1/authority/complaints/{complaint_id}/duplicates` | Yes / in-scope authority, admin | No body | `complaint_id`, `possible_duplicates`, `threshold`, `lookback_days`, `candidate_limit` | 401; 403; 404; 422 |

Use the single analysis POST while preparing Report Issue. Only `title` and
`description` are required (same limits as complaint creation). Optional `category`
(1-100), `address` (1-500), `latitude`, and `longitude` accept null. Coordinates must
be finite/in range; geography is compared only with complete coordinate pairs.
A supplied category guides department suggestion; inferred `suggested_category`
remains independent.

| Analysis field | Shape / meaning |
| --- | --- |
| `suggested_category` | String; may be `Other` |
| `confidence` | Number 0-1; category cosine similarity, not calibrated probability |
| `category_keywords` | Array of matching strings |
| `confidence_method` | String explaining category confidence |
| `suggested_department` | Object with `id`, `name`, or null for no matching active department |
| `recommended_department` | Compatibility alias for the same department; prefer `suggested_department` |
| `suggested_priority` | `low`, `medium`, `high`, or `critical` |
| `priority_signals` | Array of matched phrases, possibly empty |
| `priority_reason` | Human-readable priority explanation |
| `possible_duplicates` | Array of `complaint_id` (integer), `similarity` (number 0-1), `reason` (short string) |
| `duplicate_similarity_method` | String explaining duplicate scoring |
| `reasons` | Object with `category`, `department`, `priority`, and `duplicates` explanation strings |
| `model_version` | Local algorithm/corpus version string |
| `limitations` | Prototype limits and need for human review |

`suggested_category`, `suggested_department`, `suggested_priority`, `possible_duplicates`,
and `reasons` are the primary frontend fields. Existing complaints remain persisted
and permission-scoped; suggestions never submit or block a report.

Illustrative duplicate item (scores/reasons depend on the input and database):

```json
{"complaint_id":12,"similarity":0.91,"reason":"Similar complaint text in the same category and nearby location."}
```

Categories use local TF-IDF/cosine against synthetic English examples; priority
uses transparent phrase rules. Duplicates compare title/description, discount known
category/address disagreement, and consider distance when complete coordinates
exist. Coordinate pairs over 2 km apart are excluded. Similarity is approximate,
not proof of duplication or production accuracy.

Defaults examine up to 500 permitted reports from the previous 90 days and return
at most ten matches scoring at least 0.65. Configure `DUPLICATE_CANDIDATE_LIMIT`,
`DUPLICATE_LOOKBACK_DAYS`, and `DUPLICATE_THRESHOLD` to adjust these bounds.
Citizens compare their own reports only; staff remain scoped. The existing-complaint
GET excludes the source complaint. Only candidate IDs, scores, and short reasons
are returned, without private complaint text. No match means an empty array.

Suggestions never block submission, assign staff automatically, overwrite user
choices, merge complaints, or close a case. Category, department, priority, and
duplicate suggestions use local code without an API key or remote model. Optional
Gemini is limited to chatbot responses and image-assisted draft descriptions.

## CHATBOT

## LANGUAGE / BHASHINI

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/language/capabilities` | No / public | No body | `provider=bhashini`, `enabled=false`, `pending_approval=true`, unavailable capabilities, fallbacks | None expected |
| POST | `/api/v1/language/translate` | Yes / citizen, authority, admin | `{"text":"सड़क पर गड्ढा है।","source_language":"hi-IN","target_language":"en"}` | `available=false`, `translated=false`, `status=unavailable`, original text preserved in `text` and `original_text` | 401; 422 |

BHASHINI remains disabled pending approval. These routes make no network calls,
accept no provider credentials, and do not claim to perform speech recognition,
translation, synthesis, OCR, language detection, or transliteration.

## CHATBOT

| Method | Endpoint | Auth required / allowed role | Request body example | Important response fields | Typical errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/chatbot/message` | Optional for public FAQ; required for complaint data / owner citizen, in-scope authority, admin | JSON `{"message":"How do I report an issue?"}` | `answer`, `topic`, `suggestions` (array of strings), `complaint` (null for FAQ); compatible local fallback | 401 personal lookup without valid login; 404 complaint missing/not permitted; 422; 429 |
| POST | `/api/v1/chatbot/analyze` | Optional for draft suggestions; complaint reference requires owner citizen, in-scope authority, or admin | Multipart fields: `message` (optional, <=2,000 chars), `image` (optional JPEG/PNG/GIF/WebP <=5 MB), `latitude`, `longitude`, `complaint_id` (all optional) | `assistant_message`, `draft_complaint {title, description}`, `suggested_category`, `suggested_department`, `suggested_priority`, `possible_duplicates`, `reasons`, `ai_provider` (`gemini` or `local`), `requires_user_confirmation: true` | 401 invalid/unauthed complaint reference; 403 out-of-scope complaint; 413 image too large; 415 unsupported/mismatched image; 422 missing text+image or invalid form fields; 429 |

Authenticated complaint lookup example (send a bearer token):

```json
{"message":"What is the status of my complaint?","complaint_id":12}
```

`message` must contain 1-2,000 nonblank characters. Optional `complaint_id` must be
a positive integer no larger than 2,147,483,647. The chatbot returns only an
explicitly requested permitted complaint, never guesses another user's records.
A returned `complaint` contains only `id`, `title`, `status`, `verification_status`,
and `updated_at`. Missing/unauthorized complaints both return 404 without data.
Unauthenticated personal lookups return 401.

Local FAQ knowledge covers reporting, tracking, statuses, categories, resolution
verification, rejection/reopening, authority assignment, and basic help. Answers
include suggested follow-up prompts. It does not submit/modify complaints, store
conversations, contact staff, or call an external LLM. It uses rules/project
knowledge and can ask users to rephrase unsupported questions.

When `GEMINI_API_KEY` is configured in the backend process or ignored `backend/.env`,
the message endpoint may provide a multilingual answer and `/analyze` may describe an
uploaded civic-issue image. `GEMINI_MODEL` optionally selects the model; default is
`gemini-2.5-flash`. Credentials stay in the request header and are never included in
responses/log messages. Model calls receive sanitized user text and only the validated
image supplied to the analyze endpoint; complaint data is resolved locally and never
sent to Gemini. Image descriptions are uncertain and
must not infer personal attributes or claim official resolution. Quota, network, or
model errors fall back to local FAQ/draft behavior. An image without Gemini is not
interpreted; the local response asks the citizen for a text description. No endpoint
automatically creates a complaint; the user must review and submit the returned draft.

Chatbot and analysis each have a per-peer counter using `RATE_LIMIT_INTELLIGENCE`
(default 20 per 60 seconds). Limits are per process and reset on restart; they are
not deployment-wide.
