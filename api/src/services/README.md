# SharePoint Service Layer

This directory contains the SharePoint service abstraction layer that enables the LML Lift Consultants Work Management Portal to work with both sandbox (local development) and production (real Microsoft Graph API) SharePoint environments.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│   Azure Function Endpoints              │
│   (handlers/sharepoint-*.ts)            │
└───────────────┬─────────────────────────┘
                │
                ├──────────────────────────┐
                │                          │
        ┌───────▼────────┐        ┌───────▼────────┐
        │ Factory Pattern │        │  Service       │
        │                 │        │  Interface     │
        └───────┬─────────┘        └────────────────┘
                │
    ┌───────────┴──────────┐
    │                      │
┌───▼────────────┐  ┌──────▼───────────┐
│ Sandbox Mode   │  │ Production Mode  │
│ (Development)  │  │ (Real SharePoint)│
└───┬────────────┘  └──────┬───────────┘
    │                      │
┌───▼────────────┐  ┌──────▼────────────┐
│ Azure Blob     │  │ Microsoft Graph   │
│ + Table        │  │ API               │
│ Storage        │  │                   │
└────────────────┘  └───────────────────┘
```

## Files

### Core Interface

**`ISharePointService.ts`**
- Defines the contract that both implementations must follow
- All methods return Graph API-compatible response shapes
- Never modify this interface without updating both implementations

**Methods:**
- `createFolder(parentId, folderName): Promise<DriveItem>`
- `uploadFile(parentId, fileName, buffer, mimeType, metadata): Promise<DriveItem>`
- `listFolderChildren(folderId): Promise<DriveItem[]>`
- `getFolderOrFile(itemId): Promise<DriveItem>`
- `getDownloadUrl(itemId): Promise<string>`
- `deleteItem(itemId): Promise<void>`

### Type Definitions

**`types/sharepoint.ts`**
- `DriveItem` - Microsoft Graph API DriveItem structure
- `FileMetadata` - Custom metadata for uploaded files
- `SandboxDriveItemEntity` - Azure Table Storage entity schema
- `DownloadUrlResponse` - Response from download URL endpoints

### Implementations

**`sandboxSharePointService.ts`**
- Implements `ISharePointService` using Azure Storage
- Used during local development when Graph API access is unavailable
- Logs all operations with `[SANDBOX]` prefix
- Backed by:
  - **Azure Blob Storage**: File contents
  - **Azure Table Storage**: Metadata (mimics Graph API structure)

**`sharePointService.ts`** (not yet implemented)
- Will implement `ISharePointService` using real Microsoft Graph API
- Used in production with organization credentials
- Requires proper Azure AD app registration and permissions

### Factory

**`sharePointServiceFactory.ts`**
- Provides the correct implementation based on `SANDBOX_MODE` env var
- Caches the service instance for performance
- All endpoint handlers must import from this factory, never directly

## Environment Variables

### Sandbox Mode

```env
SANDBOX_MODE=true
SANDBOX_STORAGE_CONNECTION_STRING=<your-connection-string>
SANDBOX_STORAGE_ACCOUNT_NAME=<your-account-name>
SANDBOX_STORAGE_ACCOUNT_KEY=<your-account-key>
SANDBOX_SP_DRIVE_ID=sandbox-drive-001
SANDBOX_SP_SITE_ID=sandbox-site-001
```

### Production Mode

```env
SANDBOX_MODE=false
GRAPH_SP_TENANT_ID=<org-tenant-id>
GRAPH_SP_CLIENT_ID=<org-client-id>
GRAPH_SP_CLIENT_SECRET=<org-client-secret>
GRAPH_SP_SITE_URL=<sharepoint-site-url>
GRAPH_SP_DRIVE_ID=<real-drive-id>
```

## Sandbox Implementation Details

### Blob Storage Structure

```
sandbox-sharepoint-drive/
  {driveId}/
    {parentId}/
      {fileId}--{originalFileName}
```

- **Container**: `sandbox-sharepoint-drive`
- **Access**: Private (SAS tokens only)
- **Metadata**: Stored on each blob (originalName, mimeType, uploadedBy, etc.)

### Table Storage Schema

**Table**: `SandboxDriveItems`

| Column | Type | Description |
|--------|------|-------------|
| PartitionKey | string | driveId (all items in one partition) |
| RowKey | string | itemId (UUID) |
| itemId | string | Same as RowKey |
| driveId | string | Matches SANDBOX_SP_DRIVE_ID |
| parentId | string \| null | Parent folder ID, null for root |
| name | string | Display name |
| type | string | 'folder' or 'file' |
| mimeType | string \| null | MIME type (null for folders) |
| blobPath | string \| null | Full blob path (null for folders) |
| size | number \| null | File size in bytes (null for folders) |
| webUrl | string | Fake URL for Graph API compatibility |
| createdAt | DateTime | UTC timestamp |
| updatedAt | DateTime | UTC timestamp |
| createdBy | string | User ID from JWT |

**Query Patterns:**
- List children: `PartitionKey eq driveId AND parentId eq {folderId}`
- Get item: `PartitionKey eq driveId AND RowKey eq {itemId}`
- Check duplicates: Filter by parentId + name + type

### SAS Token Generation

- **Permissions**: Read-only (`r`)
- **Expiry**: 15 minutes from generation
- **Scope**: Specific blob only
- Used for `getDownloadUrl()` to provide time-limited file access

## Graph API Compatibility

All DriveItem responses match the Microsoft Graph API structure:

```typescript
{
  id: string;
  name: string;
  webUrl: string;
  size?: number; // For files only
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy: { user: { id, displayName } };
  lastModifiedBy: { user: { id, displayName } };
  parentReference: { id, driveId, path? };
  file?: { mimeType: string }; // For files
  folder?: { childCount: number }; // For folders
}
```

## Usage Example

```typescript
import { getSharePointService } from './services/sharePointServiceFactory';

export async function createProjectFolder(req: Request): Promise<Response> {
  // Factory returns the correct implementation automatically
  const spService = getSharePointService();

  // Create folder - works identically in sandbox or production
  const folder = await spService.createFolder('root', 'Project-2024-001');

  return { statusCode: 200, body: JSON.stringify(folder) };
}
```

## Error Handling

All methods throw errors with appropriate status codes:

- **400**: Bad request (invalid input, folder operations on files)
- **404**: Item not found
- **409**: Conflict (duplicate folder name)
- **500**: Internal server error (Azure service failures)

Always wrap calls in try-catch and handle specific status codes.

## Logging

### Sandbox Mode
All operations log with `[SANDBOX]` prefix:
```
[SANDBOX] SharePoint service initialized with driveId: sandbox-drive-001
[SANDBOX] Creating folder: Documents under parent: root
[SANDBOX] Folder created successfully: a1b2c3d4-...
```

### Production Mode
Logs use standard Graph API operation names (to be implemented).

## Testing

### Unit Tests
Test each implementation separately:
- Mock Azure Storage SDK for sandbox tests
- Mock Graph API client for production tests

### Integration Tests
- Sandbox: Test against real Azure Storage (dev subscription)
- Production: Test against real SharePoint (requires org credentials)

### Switching Modes
Reset cache when switching modes in tests:
```typescript
import { resetServiceCache } from './services/sharePointServiceFactory';

beforeEach(() => {
  resetServiceCache();
  process.env.SANDBOX_MODE = 'true';
});
```

## Future Enhancements

1. **Batch Operations**: Support multiple file uploads/deletes in one call
2. **Metadata Search**: Query files by custom metadata
3. **Version History**: Track file versions (sandbox currently doesn't)
4. **Permissions**: Implement per-folder access control
5. **Thumbnails**: Generate and cache thumbnails for images
6. **Real-time Sync**: Webhook integration for SharePoint changes

## Maintenance

### Adding New Operations

1. Add method to `ISharePointService`
2. Implement in `SandboxSharePointService`
3. Implement in `SharePointService` (when available)
4. Update this documentation
5. Add tests for both implementations

### Breaking Changes

When modifying the interface:
1. Update interface documentation
2. Update both implementations
3. Update all endpoint handlers
4. Update frontend clients
5. Version the API endpoint if needed

## Security Considerations

### Sandbox Mode
- SAS tokens never exceed 15-minute expiry
- Blob container is private (no anonymous access)
- All metadata includes uploadedBy for audit trail
- File name validation prevents path traversal

### Production Mode
- Graph API permissions follow principle of least privilege
- Token refresh handled automatically
- All operations logged to database
- Rate limiting applied at API level

## References

- [Microsoft Graph API - DriveItem](https://learn.microsoft.com/en-us/graph/api/resources/driveitem)
- [Azure Blob Storage - SAS Tokens](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
- [Azure Table Storage - Best Practices](https://learn.microsoft.com/en-us/azure/storage/tables/table-storage-design)
