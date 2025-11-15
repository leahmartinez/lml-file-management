# Data System Documentation

## Overview

The application uses a robust data service layer that abstracts data fetching from CSV files or API endpoints. This allows easy switching between data sources without changing component code.

## Architecture

### Data Hierarchy

```
Site (Building)
  └── Project (e.g., "3 Elevator Upgrade")
      └── Asset (Individual elevators, escalators, moving walkways)
```

### Key Components

1. **Type Definitions** (`src/types/data.ts`)
   - Defines TypeScript interfaces for all data models
   - Ensures type safety across the application

2. **Data Source Configuration** (`src/config/dataSource.ts`)
   - Central configuration for switching between CSV and API
   - Single place to update when API becomes available

3. **Data Service Layer** (`src/services/dataService.ts`)
   - Abstracts data fetching logic
   - Handles CSV parsing and API requests
   - Transforms raw data into structured objects

4. **Data Hooks** (`src/hooks/useData.ts`)
   - React hooks for accessing data
   - Provides loading states and error handling
   - Easy to use in components

## Current Data Sources

### CSV Files (Current)
- **Assets**: `/public/master_data.csv`
- **Sites/Projects**: `/public/sites_data.csv`
- **Contacts**: `/public/contacts_data.csv`

### API Endpoints (Future)
- Configured in `src/config/dataSource.ts`
- Will be used when `DATA_SOURCE_TYPE` is set to `'api'`

## Usage

### Basic Usage

```typescript
import { useAssets, useSites, useProjects } from '@/hooks/useData';

function MyComponent() {
  const { data: assets, loading, error, refetch } = useAssets();
  const { data: sites } = useSites();
  const { data: projects } = useProjects();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {assets.map(asset => (
        <div key={asset.id}>{asset.name}</div>
      ))}
    </div>
  );
}
```

### Filtered Data

```typescript
import { useAssetsBySite, useAssetsByProject } from '@/hooks/useData';

function SiteAssets({ siteName }: { siteName: string }) {
  const { data: assets, loading } = useAssetsBySite(siteName);
  // Returns only assets for the specified site
}

function ProjectAssets({ projectCode }: { projectCode: string }) {
  const { data: assets, loading } = useAssetsByProject(projectCode);
  // Returns only assets for the specified project
}
```

### All Data at Once

```typescript
import { useAllData } from '@/hooks/useData';

function Dashboard() {
  const { data, loading, error } = useAllData();
  
  // data.sites - all sites
  // data.projects - all projects
  // data.assets - all assets
  // data.contacts - all contacts
  
  // Data is automatically linked:
  // - site.assets contains assets for that site
  // - project.assets contains assets for that project
  // - site.projects contains projects for that site
}
```

## Switching to API

When the API becomes available, follow these steps:

1. **Update Configuration** (`src/config/dataSource.ts`):
   ```typescript
   const DATA_SOURCE_TYPE: DataSourceType = 'api'; // Change from 'csv' to 'api'
   
   const API_CONFIG = {
     baseUrl: 'https://your-api-url.com',
     endpoints: {
       sites: '/api/sites',
       projects: '/api/projects',
       assets: '/api/assets',
       contacts: '/api/contacts',
     },
   };
   ```

2. **API Response Format**:
   The API should return data in one of these formats:
   - Array: `[{...}, {...}]`
   - Object with `data` property: `{ data: [{...}, {...}] }`
   - Object with `results` property: `{ results: [{...}, {...}] }`

3. **Authentication** (if needed):
   Update `src/services/dataService.ts` in the `fetchAPI` function:
   ```typescript
   const response = await fetch(url, {
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`, // Add auth token
     },
   });
   ```

4. **Test**:
   - All existing components will automatically use the API
   - No component code changes needed!

## Backward Compatibility

Old hooks are still available but deprecated:
- `useMasterData()` → Use `useAssets()` instead
- `useSitesData()` → Use `useSites()` instead
- `useContactsData()` → Use `useContacts()` instead

These old hooks now use the data service layer internally, so they still work but should be migrated to the new hooks for better loading/error handling.

## Data Models

### Asset
- Represents individual units (elevators, escalators, moving walkways)
- Linked to a Site via `building` property
- Linked to a Project via `projectCode` property

### Project
- Represents a project within a site (e.g., "3 Elevator Upgrade")
- Linked to a Site via `building` property
- Contains multiple Assets

### Site
- Represents a building/location (e.g., "Tower A")
- Contains multiple Projects
- Contains multiple Assets

### Contact
- Contact information
- Can be linked to a Site via `site` property

## Error Handling

All hooks provide error states:
```typescript
const { data, loading, error, refetch } = useAssets();

if (error) {
  // Handle error
  console.error('Failed to load assets:', error.message);
  // Optionally retry
  error.retry?.();
}
```

## Loading States

All hooks provide loading states:
```typescript
const { data, loading } = useAssets();

if (loading) {
  return <LoadingSpinner />;
}
```

## Refetching Data

All hooks provide a `refetch` function:
```typescript
const { data, refetch } = useAssets();

// Manually refetch data
<Button onClick={() => refetch()}>Refresh</Button>
```

## Best Practices

1. **Use TypeScript types**: Import types from `@/types/data` for type safety
2. **Handle loading states**: Always check `loading` before rendering data
3. **Handle errors**: Display error messages to users
4. **Use filtered hooks**: Use `useAssetsBySite()` instead of filtering manually
5. **Don't hardcode data**: Always fetch from the data service

## Migration Guide

### From Old Hooks to New Hooks

**Before:**
```typescript
const masterData = useMasterData();
const sitesData = useSitesData();
```

**After:**
```typescript
const { data: assets, loading, error } = useAssets();
const { data: sites, loading: sitesLoading } = useSites();
```

### Benefits
- Loading states
- Error handling
- Type safety
- Easy API migration
- Better performance (caching, etc.)

