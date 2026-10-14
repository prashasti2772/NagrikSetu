# NagrikSetu

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

Development currently uses SQLite. Supabase connection troubleshooting and
production deployment are deferred. No external API credentials are needed for
local complaint analysis or the chatbot.

- [Backend setup and SQLite validation](backend/README.md)
- [Frontend API contract](backend/API_CONTRACT.md)
- [React frontend handoff](backend/FRONTEND_HANDOFF.md)

For local frontend integration, use `VITE_API_BASE_URL=http://127.0.0.1:8000` and
the full `/api/v1/...` paths in the contract. The backend permits both Vite default
origins (`localhost:5173` and `127.0.0.1:5173`) through configurable CORS settings.
