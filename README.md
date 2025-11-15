# LML File Management

A comprehensive consulting portfolio management system for LML Lift Consultants to manage Vertical Transport projects across multiple Australian sites with Microsoft 365/SharePoint integration.

## Overview

LML File Management provides a centralized platform for:
- **Lift Consultants**: Manage consulting sites, projects, deliverables, and client communications
- **Project Managers**: Track project stages, notes, and document management across states
- **Administrators**: Oversee all sites, projects, and user assignments
- **Site Managers**: Manage projects assigned to their specific sites

The application integrates with SharePoint/Microsoft 365 for live document browsing, uploads, and downloads while maintaining a centralized project management interface.

## Features

### Dashboard
- Real-time project overview with key metrics
- Interactive charts for project status, state distribution, and performance metrics
- Site and project summaries with quick access to active projects

### Projects Portfolio
- Comprehensive project listing with filtering by state and status
- Detailed project cards showing code, site, description, and stage progress
- Project notes and historical timeline view
- State-based project code management (PVXXXX, PNXXXX, PSAXXXX, PQXXXX)

### Sites Management
- Browse sites and associated projects
- Project organization by stage (Feasibility, Technical Specification, Tender, Contract Draft, Project Management)
- File management with stage-based organization
- SharePoint integration for document access

### Project Management
- 5-stage project workflow per project
- Project notes with historical timeline and author tracking
- Contact assignment (internal consultants and external contacts)
- Rich text descriptions for sites and projects
- Project status tracking (Active, On Hold, Completed, Archived)

### Contacts Directory
- Internal consultant profiles (LML users)
- External contact management (clients, contractors)
- Project-based contact assignments
- User availability and assignment tracking

### File Management
- Stage-based file organization
- SharePoint document integration
- File upload and download capabilities
- Support for different document types (specifications, contracts, permits, etc.)

### Admin Portal
- User management with role-based access
- Role-based access control (admin, consultant, national_manager, site_manager)
- Site assignment for site managers
- Contact and project assignment management

### Security
- Password hashing and secure authentication
- Role-based access control
- Session management via JWT tokens (Phase 3+)
- XSS protection and input validation

## Technology Stack

- **Frontend Framework**: React 18.3.1 with TypeScript 5.8
- **Build Tool**: Vite 6.4.1
- **UI Components**: shadcn/ui (Radix UI) + Tailwind CSS
- **State Management**: React Context + TanStack React Query 5.83
- **Routing**: React Router v6.30.1
- **Forms**: React Hook Form 7.61 + Zod 3.25 validation
- **Charts**: Recharts 2.15
- **Backend**: Azure Functions v4 (Node.js 20+, TypeScript)
- **Database**: Azure Table Storage (NoSQL)
- **File Storage**: Azure Blob Storage
- **Email**: Azure Communication Services
- **Deployment**: Azure Static Web Apps
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Git

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd lml-file-management

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173` (Vite default)

### Default Users

The application includes the following default users (all with password: `password`):

- **admin**: Full administrative access
- **consultant**: Can manage sites, projects, and upload files
- **national_manager**: Can view all projects and reports
- **site_manager_a**: Can view projects for "Melbourne Central" only
- **site_manager_b**: Can view projects for "Sydney Tower" only

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once (CI mode)
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with UI

## Project Structure

```
src/
├── components/        # React components
│   ├── admin/        # Admin portal components
│   ├── contacts/     # Contact directory components
│   ├── dashboard/    # Dashboard charts and cards
│   ├── sites/        # Site and project management components
│   ├── profile/      # User profile components
│   └── ui/           # shadcn/ui components
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── services/         # Data service layer
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── lib/              # Library utilities
└── test/             # Test utilities and mocks
```

## Data Structure

### Core Data Models

- **Site**: Building/location with multiple projects
- **Project**: Consulting project with state-based code (PVXXXX, PNXXXX, PSAXXXX, PQXXXX)
- **ProjectStage**: Fixed 5-stage workflow per project
- **ProjectFile**: Documents organized by stage
- **ProjectNote**: Historical timeline with author tracking
- **UserProfile**: Internal consultant profiles
- **ExternalContact**: Client and contractor contacts

### Storage

Data is stored in:
- **Development**: localStorage (temporary) with mock data
- **Production**: Azure Table Storage with Blob Storage for files

## Project Phases

### Phase 1: Repository Setup ✅
- Fork from liftwatch-asset-view
- Package metadata updates

### Phase 2: Data Model Refactoring ✅
- Implemented state-based project codes
- Created 5-stage project workflow
- Added project notes and timeline
- Removed asset-related code

### Phase 3: SharePoint/M365 Integration (In Progress)
- Microsoft Graph API setup
- OAuth authentication
- SharePoint file browser
- Document upload/download

### Phase 4: Frontend - Sites Tab Overhaul
- Refactor Sites page with project organization
- Create project detail view
- Implement stage-based file browser

### Phase 5: Frontend - Notes & Descriptions
- Project notes timeline component
- Rich text editor integration
- Site/project description fields

### Phase 6: Frontend - Contacts Enhancement
- Contact directory with project filtering
- Project-contact assignments

### Phase 7: Dashboard & Navigation
- Dashboard updates for consulting metrics
- Navigation refinement

### Phase 8: Testing
- Unit and integration tests
- SharePoint integration tests

### Phase 9: Deployment
- Azure Static Web Apps deployment
- Full integration testing

## Deployment

### Azure Static Web Apps

The application is configured for deployment to Azure Static Web Apps. See [`docs/azure-deploy.md`](./docs/azure-deploy.md) for detailed deployment instructions.

1. Create an Azure Static Web App resource
2. Configure GitHub Actions (workflow file included)
3. Push to main branch to trigger deployment

The application includes:
- `staticwebapp.config.json` - Azure Static Web Apps configuration
- `.github/workflows/azure-static-web-apps-*.yml` - CI/CD pipeline

## Testing

The application includes a comprehensive test suite covering:

- **Unit Tests**: Utility functions, validation
- **Component Tests**: UI components
- **Integration Tests**: User flows and role-based access
- **Security Tests**: Authentication and XSS protection

Run tests with:
```sh
npm run test:run
```

See [`docs/TESTING.md`](./docs/TESTING.md) for detailed testing documentation.

## Security Considerations

- Passwords are hashed using bcrypt (server-side in production)
- Role-based access control enforced at route level
- Input validation and XSS protection
- Session management via JWT tokens (planned)
- Security headers configured for Azure deployment
- Production-safe logging

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test:run`
4. Ensure linting passes: `npm run lint`
5. Submit a pull request

## License

Private project - All rights reserved. For LML Lift Consultants.

## Documentation

Full documentation is available in the [`docs/`](./docs/) directory:

- [Production Migration Plan](./docs/PRODUCTION_MIGRATION_PLAN.md) - Server-side authentication implementation
- [Security Audit](./docs/SECURITY_AUDIT.md) - Security analysis and recommendations
- [Testing Guide](./docs/TESTING.md) - Test suite documentation
- [Deployment Guide](./docs/azure-deploy.md) - Azure deployment procedures
- [Data System](./docs/DATA_SYSTEM.md) - System architecture

## Support

For issues or questions, please contact the LML development team.
