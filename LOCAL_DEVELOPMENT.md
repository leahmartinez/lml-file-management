# LML File Management - Local Development Guide

## Overview

The LML File Management app is configured to run **entirely locally** without requiring any backend API or Azure resources.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:5173**

## Local Development Features

### Mock Data
- Uses mock data from `src/test/mockData.ts`
- Contains 4 LML projects across all Australian states:
  - **PV1296** (Victoria) - Melbourne Central - 6 elevators
  - **PN2001** (NSW) - Sydney Tower - 3 elevators
  - **PSA0045** (South Australia) - Adelaide Plaza - moving walkways
  - **PQ3012** (Queensland) - Brisbane Heights - control systems
- Each project has 5 predefined stages (Feasibility, Technical Spec, Tender, Contract Draft, Project Management)
- Sample project notes with historical timeline

### Mock Authentication
Local login uses these test users (password: `password`):

| Email | Role | Sites | Purpose |
|-------|------|-------|---------|
| `admin@lml.com` | Admin | All | Full administrative access |
| `consultant@lml.com` | Consultant | All | Consultant access, project management |
| `manager@lml.com` | National Manager | All | View all projects and reports |
| `site_manager_a@lml.com` | Site Manager | Melbourne Central | View Melbourne Central only |
| `site_manager_b@lml.com` | Site Manager | Sydney Tower | View Sydney Tower only |

### No Backend Required
- No API server needed (`localhost:7071`)
- No Azure resources required
- No environment configuration needed (uses `.env.local` automatically)
- All data served from JavaScript mock files

---

## Local Development Environment Variable

The `.env.local` file is automatically configured:

```
VITE_USE_MOCK_DATA=true
VITE_ENV=local
```

This tells the app to:
1. Use mock data instead of API calls
2. Use mock authentication instead of API authentication
3. Skip all backend connectivity

---

## Application Pages

### Available Pages

1. **Dashboard** (`/`)
   - Overview of projects
   - Project statistics
   - Coming soon: Project metrics (currently shows asset metrics placeholder)

2. **Portfolio** (`/portfolio`)
   - Grid view of all projects
   - Filter by state (Victoria, NSW, SA, QLD)
   - Filter by status (Active, On Hold, Completed, Archived)
   - Search by project code or description
   - Click "View Project Details" for more information

3. **Sites** (`/sites`)
   - Browse all consulting sites
   - View projects at each site
   - Verify site and project organization

4. **Contacts** (`/contact`)
   - Contact directory (internal consultants and external contacts)
   - Project-based contact assignments

5. **Admin** (`/admin`) - *Admin/Consultant Only*
   - User management interface
   - Site assignments for site managers

### Removed Pages

- **Reports** - Removed from navigation (asset-focused, not applicable to LML)

---

## Testing the App

### Quick Test Flow

1. **Login**
   - Email: `admin@lml.com`
   - Password: `password`
   - Click Login

2. **Dashboard**
   - Verify it loads without API errors
   - Check that you're logged in as admin

3. **Portfolio**
   - You should see 4 project cards (PV1296, PN2001, PSA0045, PQ3012)
   - Try filtering by state or status
   - Try searching for a project code
   - Click "View Project Details" on a card

4. **Sites**
   - You should see 4 sites (Melbourne Central, Sydney Tower, Adelaide Plaza, Brisbane Heights)
   - Each site should show its associated projects

5. **Contacts**
   - View internal and external contacts
   - Verify contact information displays

6. **Logout**
   - Click logout in the navigation
   - Try logging in as a different user
   - Test site manager access (should only see assigned site)

---

## Troubleshooting

### "Failed to load resource: 404" Errors

These are expected if the old LML API is referenced. The app should:
- Skip these errors (they're from old asset features)
- Continue to function with mock data
- Show all projects and sites correctly

### No API Calls Expected

If you see any API calls to:
- `localhost:7071`
- `your-api.azurewebsites.net`
- Other Azure URLs

This indicates the app is trying to use backend APIs instead of mock data. Check that `.env.local` is properly set with `VITE_USE_MOCK_DATA=true`.

### Auth Issues

If login is not working:
1. Verify you're using one of the test emails listed above
2. Password is always: `password`
3. Check browser console for error messages
4. Ensure `.env.local` exists in the project root

---

## Mock Data Structure

Mock data is defined in `src/test/mockData.ts` and includes:

### Projects (4 total)
```typescript
interface Project {
  projectCode: string;       // PVXXXX, PNXXXX, PSAXXXX, PQXXXX
  building: string;          // Site name
  description: string;       // Project description
  status: ProjectStatus;     // Active, On Hold, Completed, Archived
  state: ProjectState;       // Victoria, NSW, South Australia, Queensland
  stages: ProjectStage[];    // 5 predefined stages
  notes: ProjectNote[];      // Historical timeline
  contacts: string[];        // Assigned contact emails
  createdAt: string;        // ISO date
  updatedAt: string;        // ISO date
}
```

### Sites (4 total)
```typescript
interface Site {
  building: string;          // Site name (identifier)
  address: string;           // Street address
  state: ProjectState;       // Australian state
  city: string;              // City
  description: string;       // Site description
  projects: Project[];       // Associated projects
  contacts: string[];        // Assigned contacts
}
```

### Project Stages (5 per project)
```typescript
interface ProjectStage {
  id: string;
  name: ProjectStageName;   // Feasibility, Technical Specification, Tender, Contract Draft, Project Management
  projectCode: string;
  files: ProjectFile[];     // Files in this stage
  order: number;            // 1-5
  description: string;
  createdAt: string;
}
```

### Project Notes
```typescript
interface ProjectNote {
  id: string;
  projectCode: string;
  content: string;          // Markdown/HTML supported
  author: string;           // User email
  authorName: string;       // Display name
  createdAt: string;        // ISO date
  status: string;           // Project status at time of note
}
```

---

## Development Workflow

### Making Changes

1. Edit files in `src/` directory
2. Vite hot module reloading will automatically refresh the app
3. No need to restart the dev server

### Adding Mock Data

To add more projects/sites to the mock data:
1. Edit `src/test/mockData.ts`
2. Add new entries to `mockProjects` or `mockSites` arrays
3. Follow the existing structure
4. Save the file - app will reload automatically

### Testing Specific Roles

1. Logout current user
2. Login with different test user
3. Verify access restrictions work:
   - Site managers should only see their assigned sites
   - Consultants should see all sites
   - etc.

---

## Next Steps

When you're ready to integrate with real backend/SharePoint (Phase 3):

1. Create new Azure resources (Static Web App, Functions, Storage)
2. Update configuration files to point to new Azure endpoints
3. Remove `.env.local` or set `VITE_USE_MOCK_DATA=false`
4. Deploy to Azure Static Web App

For now, continue development with local mock data!

---

## Support

For issues or questions:
1. Check browser console (`F12` > Console tab) for error messages
2. Verify `.env.local` exists with `VITE_USE_MOCK_DATA=true`
3. Confirm you're using correct test user credentials
4. Restart the dev server if changes don't appear


