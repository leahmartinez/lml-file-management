# System Architecture — LML File Management (LML Lift Consultants Work Management Portal)

## Plain-English Overview

Think of this app as replacing a messy pile of spreadsheets, email threads, and shared folders with one website everyone at LML logs into.

**What it does:**
- Keeps track of every consulting site, project, and the stage of work happening at each one
- Lets staff create and track fee proposals for clients, before they become paid projects
- Assigns work to specific consultants and tracks progress
- Links out to the company's existing SharePoint/Microsoft 365 folders so people can still open the actual documents
- Keeps a directory of clients, contractors, and staff
- Shows dashboards and summaries of what's going on across the business

**How it's put together, in simple terms:**
- There are two main pieces: a **website** (what people see and click around in) and a **backend** (a set of small programs that handle logins, save data, and talk to Microsoft's services).
- The website is a modern React app — the same kind of technology used by most professional web apps today.
- The backend runs on Microsoft Azure "Functions," which are small, on-demand pieces of code rather than one big always-on server. This is cost-efficient and scales automatically.
- Data (sites, projects, proposals, contacts, etc.) is stored in an Azure database designed for this kind of app. Uploaded files live in Azure's file storage.
- Login/password checking, sending emails, and connecting to SharePoint are all handled by the backend, not directly by the website — this keeps sensitive operations off users' computers.
- Everything is hosted on Microsoft Azure and deploys automatically whenever approved changes are pushed to the main branch, via GitHub.

**How security is handled, in simple terms:**
- Passwords are never stored in a readable form — they're scrambled (hashed) before saving, using an industry-standard method (bcrypt), so even LML staff with database access can't see anyone's actual password.
- Every person has a role (Admin, Director, LML Consultant, Sub-Consultant, Admin Staff) that determines what they can see and do — e.g. only Admins and Directors can set pricing on proposals, Sub-Consultants can't see pricing at all.
- Logging in gives you a temporary "pass" (a token) that expires after 24 hours, so a stolen session doesn't last forever.
- Repeated failed login attempts are automatically throttled to make password-guessing attacks impractical.
- The site is protected against common web attacks (script injection, clickjacking, MIME-sniffing) with standard browser security headers.
- All access checks happen on the backend server, not just in the website's code — so someone can't bypass restrictions just by tampering with what runs in their browser.

**Known weak spots (worth knowing about, not urgent emergencies):**
- The login token is currently stored in the browser's local storage, which is slightly less safe than the more locked-down storage method the team intended to use — this is a known, fixable gap, not an active breach.
- The real (production) connection to SharePoint isn't finished yet — the app currently uses a stand-in/simulated version for that integration.
- An older security review document in the project is now out of date and describes a much earlier, less secure version of the app — it shouldn't be used as the current picture.

---

## Technical Architecture

### 1. What it is

A bespoke work-management portal for LML Lift Consultants (Australian vertical-transport consultancy). It replaces spreadsheets/email/SharePoint sprawl with one app covering fee proposals, projects/sites, stage-level work assignment, SharePoint document access, contacts, and dashboards. Single Azure tenant, role-based views for Admin, Director, LMLConsultant, SubConsultant, AdminStaff.

### 2. High-level shape

```
┌─────────────────────────────┐        HTTPS/JSON        ┌──────────────────────────────┐
│  React SPA (Vite build)     │ ───────────────────────▶ │  Azure Functions v4 (Node/TS) │
│  Served as static files      │ ◀─────────────────────── │  /api/* HTTP triggers         │
│  via Azure Static Web Apps   │      JWT bearer token     └──────────────┬───────────────┘
└──────────────┬───────────────┘                                         │
               │                                                          ▼
               │                                          ┌───────────────────────────────┐
               ▼                                          │ Azure Data Tables (NoSQL)      │
     Azure MSAL (browser) ──▶ Microsoft Graph API          │ Users, Sites, Projects, Stages,│
     (SharePoint SSO / file browse)                        │ Proposals, Contacts, etc.      │
                                                             └───────────────────────────────┘
                                                             ┌───────────────────────────────┐
                                                             │ Azure Blob Storage             │
                                                             │ file uploads, attachments       │
                                                             └───────────────────────────────┘
                                                             ┌───────────────────────────────┐
                                                             │ Azure Communication Services   │
                                                             │ transactional email             │
                                                             └───────────────────────────────┘
```

Single Azure Static Web App resource hosts both the built SPA (`app_location: build`) and a managed Azure Functions API (`api_location: api/dist`), deployed together via one GitHub Actions workflow on push to the deploy branch.

### 3. Frontend

- **Stack**: React 18 + TypeScript (strict), Vite 6, React Router v6, TanStack Query v5 for all data fetching, React Hook Form + Zod for forms, Tailwind + shadcn/ui (Radix primitives), Lexical/TinyMCE for rich text, Recharts for charts.
- **Structure**: `src/components` (feature-grouped: admin, contacts, dashboard, proposals, sharepoint, site-files, sites, ui), `src/pages`, `src/hooks`, `src/services` (API client layer), `src/contexts` (Auth, SharePoint auth, file clipboard), `src/security` (dedicated XSS/auth security test suite), `src/config`.
- **Auth flow**: `useAuth.tsx` context — login posts credentials to `/api/auth/login`, stores the returned JWT under `localStorage['jwt_token']`, and attaches it as `Authorization: Bearer` (or `X-LML-Token`) on subsequent calls (`apiService.ts`). Route guards (`ProtectedRoute`, `AdminRoute`) gate pages client-side based on decoded role.
- **SharePoint UX**: `SharePointAuthContext` + `@microsoft/microsoft-graph-client` + `@azure/msal-browser` drive an in-browser MSAL SSO flow for live folder browsing; entities themselves just store a `sharePointFolderUrl` string opened via "Open in SharePoint" buttons — the app doesn't proxy file bytes for this path.
- **Dev-mode fallback**: `VITE_USE_MOCK_AUTH` / `VITE_USE_MOCK_DATA` flags switch to an in-memory mock user set and localStorage-backed mock data generator for local development without a backend.

### 4. Backend

- **Runtime**: Azure Functions v4 programming model, Node 20 + TypeScript. All routes registered in `api/src/functions.ts` and re-exported from `api/src/index.ts`. Express + ts-node exists only for local dev convenience — production logic lives solely in Functions (explicit convention in `docs/CLAUDE.md`).
- **Route surface** (`/api/...`): `health`, `initialize`, `profile`, `user/profile`, `profiles/{email}`, `users` (+ `approve`/`suspend`/`delete`/`update`), `auth/login`, `auth/register`, `auth/forgot-password`, `auth/reset-password`, `auth/verify-email`, `auth/resend-verification`, `auth/send-invitation`, `auth/accept-invitation`, `projects` (+ `delete`/`rename`), `sites` (+ `delete`), `contacts`, `businesses`, `job-types/*`, `proposals/*`, `alerts/*`, `sharepoint/*`.
- **Request handling pattern**: every handler validates its payload with a Zod schema (`api/src/utils/validation.ts`) before touching business logic, checks the JWT/role via `api/src/utils/auth.ts`, and returns through shared `success/error/unauthorized/forbidden` helpers in `api/src/utils/response.ts` that also inject CORS + security headers uniformly.
- **Data layer**: Azure Data Tables via `api/src/database/tableStorage.ts`, with `api/src/database/localMockDb.ts` as an in-memory swap-in when no `AZURE_STORAGE_CONNECTION_STRING` is configured (auto-detected). Schemaless NoSQL — no joins/foreign keys/transactions; relational lookups and referential integrity are handled in application code. Partition-key strategy is per-entity (e.g. Sites partitioned by state, Projects by siteId, Stages by projectId) and is a deliberate design decision per entity.
- **File storage**: Azure Blob Storage, path convention `{container}/{entityType}/{entityId}/{filename}`.
- **SharePoint integration**: abstracted behind `ISharePointService` with a factory (`sharePointServiceFactory.ts`) that switches between a `SandboxSharePointService` (Blob/Table-storage-backed simulation, used when `SANDBOX_MODE=true`) and a real Microsoft Graph API implementation for production — the real implementation is currently a stub (throws if `SANDBOX_MODE` isn't set), so production Graph API file operations aren't wired up yet.
- **Email**: Azure Communication Services, with a stated convention that every outbound send must be logged (recipient, subject, timestamp, status).

### 5. Data model (Azure Data Tables entities)

Contact, Business, Site, Project, ProjectStage, Proposal, JobType, Template — each with `partitionKey`/`rowKey`, and mandatory `createdAt/updatedAt/createdBy` audit fields. Roles are centralized in a **shared** module (`shared/constants/roles.ts`, imported by both `api/` and `src/`) so frontend and backend can't drift on role semantics — single source of truth for `UserRole` and permission-check functions (`canManageUsers`, `canSetPricing`, `canSeePricing`, `canSeeMap`, etc.), plus a legacy-role migration map (`admin`→`Admin`, `consultant`→`LMLConsultant`, etc.).

### 6. Authentication & Authorization

- **Password storage**: bcrypt, 10 salt rounds (`api/src/utils/auth.ts`), server-side only.
- **Sessions**: JWT (HS256 via `jsonwebtoken`), 24h expiry, signed with `JWT_SECRET`. Extracted from either standard `Authorization: Bearer` or a custom `X-LML-Token` header.
- **RBAC**: five roles (Admin, Director, LMLConsultant, SubConsultant, AdminStaff) with a numeric permission-level ordering (`ROLE_PERMISSION_LEVEL`) used to prevent lower-privileged users acting on higher-privileged accounts. Admin implicitly passes every `hasRole` check. Enforcement happens **server-side** in each handler via `hasRole`/`isAdmin`/`canUserManageUsers` etc., not just in frontend route guards.
- **Account lifecycle**: email verification, invitation-based account creation, admin approval (`pending`/`active`/`suspended` account status), forgot/reset password with expiring secure tokens (`crypto.randomBytes(32)`).
- **Rate limiting**: `api/src/utils/rateLimit.ts` — Azure Table-Storage-backed, per-IP+user sliding window, with distinctly stricter limits on auth endpoints (login: 5/15min, register: 3/hr, password reset: 3/hr) vs. standard (100/min) and write (30/min) endpoints. Fails **open** (allows requests) if the rate-limit table is unreachable, and is skipped entirely in local dev when storage isn't configured.
- **Microsoft SSO**: Azure MSAL (browser-side) + Graph API is used for SharePoint access/SSO, separate from the app's own JWT session.

### 7. Transport & platform security

- **Security headers**: applied both at the Azure Static Web Apps edge (`staticwebapp.config.json`: CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection) and again per-response from the Functions layer (`response.ts`: adds HSTS, Referrer-Policy, Permissions-Policy). CSP explicitly allowlists Microsoft Graph/login, Azure Blob, Google Maps, and OpenStreetMap Nominatim as connect-src, and still permits `unsafe-inline`/`unsafe-eval` in script-src.
- **CORS**: origin-allowlist driven by `ALLOWED_ORIGINS` env var (defaults to localhost only), reflected per-request rather than wildcarded, credentials allowed.
- **API routing lockdown**: `staticwebapp.config.json` sets `"route": "/api/*", "allowedRoles": []` — Static Web Apps' own platform-level auth gate is effectively open (empty allowedRoles = no SWA-level restriction), meaning **all access control for `/api/*` is delegated entirely to the Functions' own JWT/RBAC checks**, not the SWA platform.
- **Input validation**: Zod schemas throughout with strict mode (reject unexpected fields), max-length bounds on every string field (DoS/oversized-payload mitigation), transform-based normalization (email lowercasing/trimming).
- **XSS**: React's default escaping + no `dangerouslySetInnerHTML` usage found; dedicated test suite at `src/security/__tests__/xssProtection.test.tsx`.

### 8. CI/CD & environments

- GitHub Actions workflow (`.github/workflows/azure-static-web-apps-*.yml`) triggers on push, runs `npm ci && npm run build` for both root (SPA) and `api/` (Functions), then deploys via the Azure Static Web Apps action using a repo secret (`AZURE_STATIC_WEB_APPS_API_TOKEN_...`). Frontend builds to `build/`, API deploys pre-built from `api/dist`.
- Environment separation is via `.env` files (`.env`, `.env.local`, `.env.production.example`) — secrets (`JWT_SECRET`, `AZURE_STORAGE_CONNECTION_STRING`, `MSAL_CLIENT_ID`/`TENANT_ID`, ACS connection string) are required to never be hardcoded, per `docs/CLAUDE.md`.
- Local dev has automatic in-memory fallbacks (mock DB, mock auth, sandbox SharePoint service) so the app runs fully offline without live Azure resources.

### 9. Notable gaps / things worth flagging

1. **JWT is stored in `localStorage`** (`jwt_token` key, used throughout `useAuth.tsx`, `apiService.ts`, `dataService.ts`) — this directly contradicts the project's own stated convention in `docs/CLAUDE.md` ("JWT tokens are NEVER stored in localStorage"). localStorage tokens are readable by any injected/XSS script, so this is the main auth-hardening gap given the CSP already allows `unsafe-inline`/`unsafe-eval`.
2. **`docs/SECURITY_AUDIT.md` is stale** — it documents an earlier, purely client-side/localStorage version of the app (SHA-256 client-hashed passwords, no backend) with a 69/100 score. The codebase has since moved well past that (bcrypt server-side, JWT, Zod, rate limiting, RBAC enforced server-side) — the audit document itself no longer reflects reality and shouldn't be treated as current.
3. **Real SharePoint/Graph API production service is unimplemented** — `sharePointServiceFactory.ts` throws if `SANDBOX_MODE` isn't `true`; only the sandbox (Blob/Table-simulated) implementation exists today.
4. **Rate limiting fails open** and is silently disabled in local/unconfigured environments — fine for dev, but worth confirming `AZURE_STORAGE_CONNECTION_STRING` (and thus the `RateLimits` table) is actually provisioned in production, otherwise auth endpoints have no brute-force protection.
5. CSP's `unsafe-inline`/`unsafe-eval` in `script-src` widens XSS blast radius given point 1 above.
