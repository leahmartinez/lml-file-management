# LiftWatch Asset View

A comprehensive web application for managing Vertical Transport assets (elevators, escalators, moving walkways) for building managers, national managers, and consultants.

## Overview

LiftWatch Asset View provides a centralized platform for:
- **Lift Consultants (LML)**: Manage sites, upload project files, and maintain asset data
- **Clients**: Building managers and national managers can view assets, generate reports, and track maintenance
- **Contractors**: Vertical Transport companies who service and maintain units (data integration planned)

The application currently uses CSV files for data storage, with plans to integrate with contractor APIs in the future.

## Features

### Dashboard
- Real-time asset overview with key metrics
- Interactive charts for asset status, contractor distribution, and performance metrics
- Searchable asset portfolio with filtering capabilities

### Portfolio
- Comprehensive asset listing with filtering by status, type, contractor, and site
- Detailed asset information and maintenance tracking

### Reports
- Asset performance reports
- Contractor performance analysis
- Service ticket tracking
- Date range filtering and CSV export functionality

### Sites Management
- Browse sites, projects, and associated files
- Project code search functionality
- File upload and management (for consultants)
- Site and project details editing (for consultants)

### Admin Portal
- User management (admin and consultant roles)
- Role-based access control
- Site assignment for site managers

### Security
- Password hashing and secure authentication
- Role-based access control (admin, consultant, national_manager, site_manager)
- XSS protection and input validation

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI) + Tailwind CSS
- **State Management**: React Context (Auth), React Query (Data)
- **Routing**: React Router v6
- **Charts**: Recharts
- **Data Parsing**: PapaParse (CSV)
- **Testing**: Vitest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd liftwatch-asset-view

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Default Users

The application includes the following default users (all with password: `password`):

- **admin**: Full administrative access
- **consultant**: Can manage sites, upload files, and access admin portal
- **national_manager**: Can view all assets and reports
- **site_manager_a**: Can view assets for "Tower A" only
- **site_manager_b**: Can view assets for "Tower B" only

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
├── components/      # React components
│   ├── admin/      # Admin portal components
│   ├── assets/     # Asset-related components
│   ├── auth/       # Authentication components
│   ├── dashboard/  # Dashboard charts and cards
│   ├── sites/      # Site management components
│   └── ui/         # shadcn/ui components
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── services/       # Data service layer
├── types/          # TypeScript type definitions
├── lib/            # Utility functions
└── test/           # Test utilities and mocks
```

## Data Structure

The application uses CSV files for data storage (located in `/public`):

- `master_data.csv` - Asset/unit data
- `sites_data.csv` - Site and project information
- `contacts_data.csv` - Contact information
- `users.json` - User authentication data

## Deployment

### Azure Static Web Apps

The application is configured for deployment to Azure Static Web Apps. See [`docs/azure-deploy.md`](./docs/azure-deploy.md) for detailed deployment instructions.

1. Create an Azure Static Web App resource
2. Configure GitHub Actions (workflow file included)
3. Push to main branch to trigger deployment

The application includes:
- `staticwebapp.config.json` - Azure Static Web Apps configuration
- `.github/workflows/azure-static-web-apps-jolly-moss-04de19b00.yml` - CI/CD pipeline

### Production Deployment

For production with real customer data, see [`docs/PRODUCTION_MIGRATION_PLAN.md`](./docs/PRODUCTION_MIGRATION_PLAN.md).

## Testing

The application includes a comprehensive test suite covering:

- **Unit Tests**: Password utilities, authentication hooks
- **Component Tests**: UI components and route protection
- **Security Tests**: XSS protection, authentication security
- **Integration Tests**: User flows and role-based access

Run tests with:
```sh
npm run test:run
```

See [`docs/TESTING.md`](./docs/TESTING.md) for detailed testing documentation.

## Security Considerations

- Passwords are hashed using SHA-256 (client-side)
- Role-based access control enforced at route level
- Input validation and XSS protection
- Session management via localStorage
- Security headers configured for Azure deployment
- Production-safe logging (sensitive data only in dev mode)

**Note**: Current implementation is production-ready for demo/test data. For real customer data, see [`docs/SECURITY_AUDIT.md`](./docs/SECURITY_AUDIT.md) and [`docs/PRODUCTION_MIGRATION_PLAN.md`](./docs/PRODUCTION_MIGRATION_PLAN.md).

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test:run`
4. Ensure linting passes: `npm run lint`
5. Submit a pull request

## License

Private project - All rights reserved

## Documentation

Full documentation is available in the [`docs/`](./docs/) directory:

- [Production Migration Plan](./docs/PRODUCTION_MIGRATION_PLAN.md) - Server-side authentication implementation
- [Security Audit](./docs/SECURITY_AUDIT.md) - Security analysis and recommendations
- [Testing Guide](./docs/TESTING.md) - Test suite documentation
- [Deployment Guide](./docs/azure-deploy.md) - Azure deployment procedures
- [Data System](./docs/DATA_SYSTEM.md) - System architecture

## Support

For issues or questions, please contact the development team.
