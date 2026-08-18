# LML Lift Consultants — Work Management Portal

## Overview

This is a bespoke web application for LML Lift Consultants, a vertical transport
consultancy operating across Australia. It replaces a fragmented workflow that
previously lived across multiple Excel spreadsheets, SharePoint folders, Word
document templates, and email threads.

The app consolidates the full business workflow into a single platform:
- Fee proposal creation and tracking
- Project and site management
- Stage-level work assignment to consultants
- SharePoint file and template access
- Contact and client directory
- Invoicing and financial tracking
- Personal work dashboards per consultant

## Business Domain

### How the business works

1. A client approaches LML requesting a fee proposal for a set of works
2. Admin creates a proposal document using a Word template, listing all stages
3. A director prices each stage
4. The proposal is converted to PDF and sent to the client
5. If the client accepts (full or partial scope), it becomes a live project
6. Admin sets up a SharePoint project folder (organised by Australian state,
   then by job code)
7. The project is added to the projects tracker
8. Stages are assigned to consultants (historically done verbally or by email)
9. Consultants complete the work, referencing SharePoint templates and files
10. Invoicing occurs at stage completion or project milestones

### Key terminology

- **Site**: A physical location (building/address). Multiple projects can exist
  at the same site over time. Sites are grouped by Australian state.
- **Project**: A body of work at a site. Has a unique job code (e.g. VIC-2024-001).
  Nested under a site.
- **Stage**: A discrete phase of work within a project (e.g. Feasibility,
  Technical Specification, Tender, Contract Draft, Project Management).
  Stages are assigned to individual consultants and have their own status,
  planned site visit date, and files.
- **Proposal**: A fee proposal sent to a client before a project is confirmed.
  Tracked separately. Can be converted to a project on acceptance.
  Proposals contain line items called **Items** (not "stages" in the proposal
  context — use "Items" everywhere in the Proposals UI).
- **Job Type**: A category of standardised work LML performs
  (e.g. Lift Modernisation, Accessibility Upgrade, Safety Audit). Managed
  via the Admin panel. Referenced on proposals.
- **Contact**: A person in the system. Can be a Client, Contractor, or
  LML staff member.
- **Consultant**: An LML staff member who is assigned stages of work.

### Proposal statuses
- Draft
- Sent
- Under Review
- Accepted
- Part Acceptance
- Rejected
- Expired

### Stage statuses
- Not Started
- In Progress
- On Hold
- Complete

### Project statuses
- Active
- On Hold
- Complete
- Cancelled

## Tech Stack

### Frontend
- React 18 + TypeScript (strict mode)
- Vite (build tool)
- React Router v6 (client-side routing)
- TanStack Query v5 (all data fetching and mutations)
- Tailwind CSS + shadcn/ui (Radix UI primitives) — UI components
- React Hook Form + Zod (all forms and validation)
- Lexical + TinyMCE (rich text editing)
- Recharts (charts and data visualisations)
- Vitest + Testing Library (unit and integration tests)

### Backend
- Azure Functions v4 (Node.js/TypeScript) — all API endpoints
- Express + ts-node (local development server)
- Azure Data Tables (primary database — NoSQL key-value store)
- Azure Blob Storage (file storage)
- JWT + bcryptjs (authentication)
- Zod (request validation on all endpoints)

### Auth & Cloud
- Azure MSAL (Microsoft SSO integration)
- Microsoft Graph API (SharePoint access, file browsing)
- Azure Communication Services (outbound email)

## Brand & Design

- Primary colour: dark red (`#7A1C1C` range, used for buttons, active states,
  brand elements)
- UI is clean, minimal, professional — consistent with the screenshots
- All components must use shadcn/ui primitives — do not introduce new
  component libraries
- Tailwind utility classes only — no custom CSS files unless absolutely
  necessary
- Icons: use the icon library already in use in the codebase (check before
  introducing new ones)

## Critical Conventions

### TypeScript
- Strict mode always — no `any`, no type assertions without justification
- All props, return types, and function signatures must be explicitly typed
- Shared types live in `/types` — check before creating duplicates

### Frontend
- TanStack Query for ALL data fetching — never use raw `fetch` inside
  components
- Query keys must follow the existing naming convention in the codebase
  (check `/hooks` or `/queries` before adding new keys)
- Zod schemas must be defined BEFORE building the form component
- shadcn/ui primitives as the base for all UI — do not wrap them
  unnecessarily
- React Hook Form for ALL forms — no uncontrolled inputs
- Components go in `/components`, pages go in `/pages`, hooks go in `/hooks`

### Backend
- Every Azure Function endpoint MUST validate its request payload with Zod
  before any business logic runs
- Every protected endpoint MUST pass through the existing auth middleware —
  never skip it
- Error responses must follow the existing error shape — check the codebase
  before creating new error formats
- Never expose internal error details or stack traces in production responses
- Azure Functions are the ONLY server — do not add Express routes for
  production logic (Express is local dev only)

### Database (Azure Data Tables)
- Azure Data Tables is schemaless NoSQL — there are NO joins, NO foreign keys,
  NO transactions across entities
- All relational lookups are handled in application code
- Partition key design directly impacts query performance — always justify
  your partition key choice before creating a new entity
- New entities must always include: `createdAt`, `updatedAt`, `createdBy`
- The 1MB per-entity limit must be considered for any entity that could grow
  large
- Blob Storage paths follow the convention:
  `{container}/{entityType}/{entityId}/{filename}`

### Auth
- JWT tokens are NEVER stored in localStorage — follow the existing storage
  pattern
- All protected routes have frontend route guards via React Router v6
- RBAC roles must be documented whenever a new role or permission is added

### Integrations
- SharePoint folder URLs are stored on entities as plain strings — opened via
  "Open in SharePoint" buttons in the UI
- All Graph API calls must handle token expiry gracefully
- SharePoint site URLs and drive IDs must NEVER be hardcoded — always read
  from environment config
- All outbound emails via Azure Communication Services must be logged to the
  database (recipient, subject, timestamp, status)

## Navigation Structure

```
Top Nav:
- My Work        → Personal dashboard, assigned stages, map, notifications
- Projects       → Browse sites and projects, filtered by state
- Dashboard      → Projects dashboard with views, filters, financial summary
- Proposals      → Proposal tracking and creation
- Contacts       → Contact directory
- Admin          → Admin panel (restricted by role)
```

## Data Model (High Level)

```
Contact
  ├── id (rowKey)
  ├── partitionKey: "contacts"
  ├── name, email, phone, role (Client | Contractor | LMLStaff)
  ├── businessId (optional)
  └── createdAt, updatedAt, createdBy

Business
  ├── id (rowKey)
  ├── partitionKey: "businesses"
  ├── name, address
  └── createdAt, updatedAt, createdBy

Site
  ├── id (rowKey)
  ├── partitionKey: state (e.g. "VIC", "NSW", "SA")
  ├── name, address, city, state, postcode
  ├── accessDetails (rich text)
  ├── assignedContactIds[]
  └── createdAt, updatedAt, createdBy

Project
  ├── id (rowKey), jobCode
  ├── partitionKey: siteId
  ├── siteId, siteName
  ├── status (Active | OnHold | Complete | Cancelled)
  ├── description
  ├── sharePointFolderUrl
  ├── purchaseOrderFileUrls[]
  └── createdAt, updatedAt, createdBy

ProjectStage
  ├── id (rowKey)
  ├── partitionKey: projectId
  ├── projectId, stageName
  ├── status (NotStarted | InProgress | OnHold | Complete)
  ├── description (rich text)
  ├── plannedSiteVisit (date)
  ├── assignedConsultantIds[]
  ├── sharePointFolderUrl
  ├── value (currency)
  ├── invoiceStatus
  └── createdAt, updatedAt, createdBy

Proposal
  ├── id (rowKey), proposalNumber (PROP-YYYY-NNN)
  ├── partitionKey: "proposals"
  ├── clientContactId, clientName
  ├── siteId, siteName, siteAddress, suburb, state, postcode
  ├── jobTypeId, jobTypeName
  ├── generalDescription (rich text)
  ├── description (short summary)
  ├── status (Draft | Sent | UnderReview | Accepted | PartAcceptance |
  │          Rejected | Expired)
  ├── items[] (name, value, accepted: boolean)
  ├── totalValue
  ├── sharePointFolderUrl
  ├── notes
  └── createdAt, updatedAt, createdBy

JobType
  ├── id (rowKey)
  ├── partitionKey: "jobTypes"
  ├── name, description
  ├── isActive (boolean)
  └── createdAt, updatedAt, createdBy

Template
  ├── id (rowKey)
  ├── partitionKey: "templates"
  ├── name, description, fileType
  ├── sharePointUrl
  ├── applicableStageTypes[] (optional — tags to specific stage names)
  ├── isActive
  └── createdAt, updatedAt, createdBy
```

## Environment Variables

Never hardcode these — always read from environment config:
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `SHAREPOINT_SITE_URL`
- `SHAREPOINT_DRIVE_ID`
- `AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING`
- `JWT_SECRET`
- `MSAL_CLIENT_ID`
- `MSAL_TENANT_ID`

## Current Feedback Items (Admin Team Review)

These are the confirmed changes to be implemented:

1. **Proposal filters** — Add collapsible filter panel: proposal number,
   building/site name, address, suburb, state. Filters must combine with
   existing status tabs. Summary stats must reflect filtered results.

2. **Proposal form — Job Type** — Add a required Job Type dropdown to the
   New/Edit Proposal form. Options managed from Admin panel. Add a General
   Description rich text field (above the short Description field).

3. **Rename "Proposed Stages" → "Items"** — In the Proposals UI only.
   "+ Add Stage" → "+ Add Item". Do NOT change stage language in Projects.

4. **SharePoint folder linking on Proposals** — Each proposal can store a
   SharePoint folder URL. Show "Open in SharePoint" button. Show link status
   indicator on the proposals list.

5. **Template access per stage** — Add a "Templates" tab to the Stage Files
   section. Templates pulled from the database, manageable from Admin panel,
   optionally tagged to stage types. Each template has an "Open" button
   linking to its SharePoint URL.

6. **Job Types admin panel** — Full CRUD for job types in the Admin panel.
   Deactivation with warning if type is in use.