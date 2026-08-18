# SharePoint Sandbox Seeding Script

## Overview

The `seedSandboxDrive.ts` script populates the SharePoint sandbox environment with realistic test data to enable local development and testing without requiring access to the organization's SharePoint instance.

## Prerequisites

### 1. Install Required Dependencies

The script requires the following npm packages:

```bash
cd api
npm install uuid @azure/storage-blob
npm install --save-dev @types/uuid
```

### 2. Configure Environment Variables

Ensure the following variables are set in `api/local.settings.json` under the `Values` section:

```json
{
  "Values": {
    "SANDBOX_MODE": "true",
    "SANDBOX_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=https;...",
    "SANDBOX_STORAGE_ACCOUNT_NAME": "your-storage-account-name",
    "SANDBOX_STORAGE_ACCOUNT_KEY": "your-storage-account-key",
    "SANDBOX_SP_DRIVE_ID": "sandbox-drive-001"
  }
}
```

### 3. Create Azure Storage Resources

If you haven't already, create the required Azure Storage resources:

```bash
# Create resource group
az group create --name lml-sandbox-rg --location australiaeast

# Create storage account
az storage account create \
  --name lmlsandboxstorage \
  --resource-group lml-sandbox-rg \
  --location australiaeast \
  --sku Standard_LRS

# Create blob container
az storage container create \
  --name sandbox-sharepoint-drive \
  --account-name lmlsandboxstorage

# Create table storage
az storage table create \
  --name SandboxDriveItems \
  --account-name lmlsandboxstorage
```

## Usage

Run the script from the `api` directory:

```bash
cd api
npx ts-node scripts/seedSandboxDrive.ts
```

## What Gets Created

The script creates the following folder structure:

```
root/
  Work Orders/
    WO-2024-001/
      Documents/
        Technical-Specification-Draft.pdf
        Contract-Template.pdf
      Photos/
      Reports/
        Site-Inspection-Report.pdf
    WO-2024-002/
      Documents/
      Photos/
  Proposals/
    PROP-2024-001/
    PROP-2024-002/
```

## Idempotency

The script is **idempotent** and safe to run multiple times:

- Checks for existing folders by name before creating
- Checks for existing files by name before uploading
- Skips creation of items that already exist
- Logs whether each item was created or skipped

## Example Output

When run successfully, you'll see output similar to:

```
═══════════════════════════════════════════════════════════
  SharePoint Sandbox Drive Seeding Script
═══════════════════════════════════════════════════════════

🔍 Validating environment configuration...

✓ Environment configuration valid
✓ SANDBOX_MODE: true
✓ Storage Account: lmlsandboxstorage

📁 Creating folder structure...

✓ Created folder: "Work Orders" [ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890]
✓ Created folder: "Proposals" [ID: b2c3d4e5-f6a7-8901-bcde-f12345678901]

📂 Work Orders/WO-2024-001
  ✓ Created folder: "WO-2024-001" [ID: c3d4e5f6-a7b8-9012-cdef-123456789012]
    ✓ Created folder: "Documents" [ID: d4e5f6a7-b8c9-0123-def1-234567890123]
    ✓ Created folder: "Photos" [ID: e5f6a7b8-c9d0-1234-ef12-345678901234]
    ✓ Created folder: "Reports" [ID: f6a7b8c9-d0e1-2345-f123-456789012345]

📂 Work Orders/WO-2024-002
  ✓ Created folder: "WO-2024-002" [ID: a7b8c9d0-e1f2-3456-1234-567890123456]
    ✓ Created folder: "Documents" [ID: b8c9d0e1-f2a3-4567-2345-678901234567]
    ✓ Created folder: "Photos" [ID: c9d0e1f2-a3b4-5678-3456-789012345678]

📂 Proposals
  ✓ Created folder: "PROP-2024-001" [ID: d0e1f2a3-b4c5-6789-4567-890123456789]
  ✓ Created folder: "PROP-2024-002" [ID: e1f2a3b4-c5d6-7890-5678-901234567890]

📄 Uploading placeholder files...

    ✓ Uploaded file: "Technical-Specification-Draft.pdf" [ID: f2a3b4c5-d6e7-8901-6789-012345678901, Size: 467 bytes]
    ✓ Uploaded file: "Contract-Template.pdf" [ID: a3b4c5d6-e7f8-9012-7890-123456789012, Size: 467 bytes]
    ✓ Uploaded file: "Site-Inspection-Report.pdf" [ID: b4c5d6e7-f8a9-0123-8901-234567890123, Size: 467 bytes]

═══════════════════════════════════════════════════════════
✓ Sandbox drive seeding completed successfully!
═══════════════════════════════════════════════════════════

📊 Summary of Created Items:

Root Folders:
  - Work Orders      [ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890]
  - Proposals        [ID: b2c3d4e5-f6a7-8901-bcde-f12345678901]

Work Order Folders:
  - WO-2024-001      [ID: c3d4e5f6-a7b8-9012-cdef-123456789012]
    - Documents      [ID: d4e5f6a7-b8c9-0123-def1-234567890123]
    - Photos         [ID: e5f6a7b8-c9d0-1234-ef12-345678901234]
    - Reports        [ID: f6a7b8c9-d0e1-2345-f123-456789012345]
  - WO-2024-002      [ID: a7b8c9d0-e1f2-3456-1234-567890123456]
    - Documents      [ID: b8c9d0e1-f2a3-4567-2345-678901234567]
    - Photos         [ID: c9d0e1f2-a3b4-5678-3456-789012345678]

Proposal Folders:
  - PROP-2024-001    [ID: d0e1f2a3-b4c5-6789-4567-890123456789]
  - PROP-2024-002    [ID: e1f2a3b4-c5d6-7890-5678-901234567890]

💡 Use these IDs for manual API testing

Example API calls:

  List WO-2024-001/Documents children:
    GET /api/sharepoint/folders/d4e5f6a7-b8c9-0123-def1-234567890123/children

  Get download URL for a file:
    GET /api/sharepoint/items/{fileId}/download-url

  Delete an item:
    DELETE /api/sharepoint/items/{itemId}
```

## Using the Created Data

### Manual API Testing

After running the script, you can use the logged item IDs to test the SharePoint API endpoints:

```bash
# List folder contents
curl http://localhost:7071/api/sharepoint/folders/{folderId}/children \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get file download URL
curl http://localhost:7071/api/sharepoint/items/{fileId}/download-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Upload a new file
curl -X POST http://localhost:7071/api/sharepoint/files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "parentId={folderId}" \
  -F "workOrderId=WO-2024-001" \
  -F "file=@/path/to/your/file.pdf"

# Delete an item
curl -X DELETE http://localhost:7071/api/sharepoint/items/{itemId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Integration Testing

Reference the created folder IDs in your integration tests:

```typescript
import { getSharePointService } from '../src/services/sharePointServiceFactory';

describe('SharePoint Integration', () => {
  it('should list WO-2024-001 Documents folder contents', async () => {
    const service = getSharePointService();

    // Use the Documents folder ID from seeding output
    const children = await service.listFolderChildren('YOUR-DOCUMENTS-FOLDER-ID');

    expect(children.length).toBeGreaterThan(0);
    expect(children.some(item => item.name === 'Technical-Specification-Draft.pdf')).toBe(true);
  });
});
```

## Troubleshooting

### Error: SANDBOX_MODE must be set to 'true'

**Solution:** Ensure `SANDBOX_MODE=true` is set in `api/local.settings.json` under the `Values` section.

### Error: Missing required environment variables

**Solution:** Verify all required environment variables are configured in `local.settings.json`:
- `SANDBOX_STORAGE_CONNECTION_STRING`
- `SANDBOX_STORAGE_ACCOUNT_NAME`
- `SANDBOX_STORAGE_ACCOUNT_KEY`

### Error: Cannot find module 'uuid'

**Solution:** Install the required dependencies:

```bash
cd api
npm install uuid @azure/storage-blob
npm install --save-dev @types/uuid
```

### Error: Failed to initialize SharePoint service

**Solution:**
1. Verify your Azure Storage account exists
2. Check that the connection string is valid
3. Ensure the `sandbox-sharepoint-drive` container exists
4. Ensure the `SandboxDriveItems` table exists

### Script runs but creates duplicates

**Problem:** This shouldn't happen if the script is working correctly. The script checks for existing items before creating.

**Debug Steps:**
1. Check the console output - it should show "⊙ Already exists" for existing items
2. Verify the Table Storage query is working by checking Azure Portal
3. If duplicates exist, delete them manually and investigate the query logic

## Resetting the Sandbox

To completely reset the sandbox and start fresh:

```bash
# Delete all blobs in the container
az storage blob delete-batch \
  --account-name lmlsandboxstorage \
  --source sandbox-sharepoint-drive

# Delete all entities in the table
# (Currently no batch delete command - use Azure Portal or Storage Explorer)
```

Then run the seeding script again to recreate the test data.

## Advanced Usage

### Custom Folder Structure

To create a different folder structure, modify the seeding script:

```typescript
// Add custom folders
const customFolder = await createOrGetFolder(
  service,
  'root',
  'My Custom Folder',
  0
);

// Add custom files
const customPDF = createPlaceholderPDF('Custom Title', 'Custom content');
await uploadOrSkipFile(
  service,
  customFolder.id,
  'custom-file.pdf',
  customPDF,
  'application/pdf',
  {
    originalName: 'custom-file.pdf',
    mimeType: 'application/pdf',
    uploadedBy: 'seed-script',
    workOrderId: 'CUSTOM-ID',
    createdAt: new Date().toISOString(),
  }
);
```

### Seeding Production Data

**WARNING:** This script is designed for sandbox/development use only. Do not run against production SharePoint or storage accounts.
