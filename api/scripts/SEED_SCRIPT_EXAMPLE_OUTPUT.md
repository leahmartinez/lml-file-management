# SharePoint Sandbox Seeding Script - Example Output

This document shows the expected output when running the `seedSandboxDrive.ts` script.

## First Run (Creating All Items)

```
═══════════════════════════════════════════════════════════
  SharePoint Sandbox Drive Seeding Script
═══════════════════════════════════════════════════════════

🔍 Validating environment configuration...

✓ Environment configuration valid
✓ SANDBOX_MODE: true
✓ Storage Account: lmlsandboxstorage

📁 Creating folder structure...

[SANDBOX] SharePoint service initialized with driveId: sandbox-drive-001
[SANDBOX] Creating folder: Work Orders under parent: root
[SANDBOX] Folder created successfully: a1b2c3d4-e5f6-7890-abcd-ef1234567890
✓ Created folder: "Work Orders" [ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890]
[SANDBOX] Creating folder: Proposals under parent: root
[SANDBOX] Folder created successfully: b2c3d4e5-f6a7-8901-bcde-f12345678901
✓ Created folder: "Proposals" [ID: b2c3d4e5-f6a7-8901-bcde-f12345678901]

📂 Work Orders/WO-2024-001
[SANDBOX] Creating folder: WO-2024-001 under parent: a1b2c3d4-e5f6-7890-abcd-ef1234567890
[SANDBOX] Folder created successfully: c3d4e5f6-a7b8-9012-cdef-123456789012
  ✓ Created folder: "WO-2024-001" [ID: c3d4e5f6-a7b8-9012-cdef-123456789012]
[SANDBOX] Creating folder: Documents under parent: c3d4e5f6-a7b8-9012-cdef-123456789012
[SANDBOX] Folder created successfully: d4e5f6a7-b8c9-0123-def1-234567890123
    ✓ Created folder: "Documents" [ID: d4e5f6a7-b8c9-0123-def1-234567890123]
[SANDBOX] Creating folder: Photos under parent: c3d4e5f6-a7b8-9012-cdef-123456789012
[SANDBOX] Folder created successfully: e5f6a7b8-c9d0-1234-ef12-345678901234
    ✓ Created folder: "Photos" [ID: e5f6a7b8-c9d0-1234-ef12-345678901234]
[SANDBOX] Creating folder: Reports under parent: c3d4e5f6-a7b8-9012-cdef-123456789012
[SANDBOX] Folder created successfully: f6a7b8c9-d0e1-2345-f123-456789012345
    ✓ Created folder: "Reports" [ID: f6a7b8c9-d0e1-2345-f123-456789012345]

📂 Work Orders/WO-2024-002
[SANDBOX] Creating folder: WO-2024-002 under parent: a1b2c3d4-e5f6-7890-abcd-ef1234567890
[SANDBOX] Folder created successfully: a7b8c9d0-e1f2-3456-1234-567890123456
  ✓ Created folder: "WO-2024-002" [ID: a7b8c9d0-e1f2-3456-1234-567890123456]
[SANDBOX] Creating folder: Documents under parent: a7b8c9d0-e1f2-3456-1234-567890123456
[SANDBOX] Folder created successfully: b8c9d0e1-f2a3-4567-2345-678901234567
    ✓ Created folder: "Documents" [ID: b8c9d0e1-f2a3-4567-2345-678901234567]
[SANDBOX] Creating folder: Photos under parent: a7b8c9d0-e1f2-3456-1234-567890123456
[SANDBOX] Folder created successfully: c9d0e1f2-a3b4-5678-3456-789012345678
    ✓ Created folder: "Photos" [ID: c9d0e1f2-a3b4-5678-3456-789012345678]

📂 Proposals
[SANDBOX] Creating folder: PROP-2024-001 under parent: b2c3d4e5-f6a7-8901-bcde-f12345678901
[SANDBOX] Folder created successfully: d0e1f2a3-b4c5-6789-4567-890123456789
  ✓ Created folder: "PROP-2024-001" [ID: d0e1f2a3-b4c5-6789-4567-890123456789]
[SANDBOX] Creating folder: PROP-2024-002 under parent: b2c3d4e5-f6a7-8901-bcde-f12345678901
[SANDBOX] Folder created successfully: e1f2a3b4-c5d6-7890-5678-901234567890
  ✓ Created folder: "PROP-2024-002" [ID: e1f2a3b4-c5d6-7890-5678-901234567890]

📄 Uploading placeholder files...

[SANDBOX] Uploading file: Technical-Specification-Draft.pdf to parent: d4e5f6a7-b8c9-0123-def1-234567890123
[SANDBOX] File uploaded to blob: sandbox-drive-001/d4e5f6a7-b8c9-0123-def1-234567890123/f2a3b4c5-d6e7-8901-6789-012345678901--Technical-Specification-Draft.pdf
[SANDBOX] File metadata saved to table: f2a3b4c5-d6e7-8901-6789-012345678901
    ✓ Uploaded file: "Technical-Specification-Draft.pdf" [ID: f2a3b4c5-d6e7-8901-6789-012345678901, Size: 467 bytes]
[SANDBOX] Uploading file: Contract-Template.pdf to parent: d4e5f6a7-b8c9-0123-def1-234567890123
[SANDBOX] File uploaded to blob: sandbox-drive-001/d4e5f6a7-b8c9-0123-def1-234567890123/a3b4c5d6-e7f8-9012-7890-123456789012--Contract-Template.pdf
[SANDBOX] File metadata saved to table: a3b4c5d6-e7f8-9012-7890-123456789012
    ✓ Uploaded file: "Contract-Template.pdf" [ID: a3b4c5d6-e7f8-9012-7890-123456789012, Size: 467 bytes]
[SANDBOX] Uploading file: Site-Inspection-Report.pdf to parent: f6a7b8c9-d0e1-2345-f123-456789012345
[SANDBOX] File uploaded to blob: sandbox-drive-001/f6a7b8c9-d0e1-2345-f123-456789012345/b4c5d6e7-f8a9-0123-8901-234567890123--Site-Inspection-Report.pdf
[SANDBOX] File metadata saved to table: b4c5d6e7-f8a9-0123-8901-234567890123
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

## Second Run (Idempotent - Skipping Existing Items)

```
═══════════════════════════════════════════════════════════
  SharePoint Sandbox Drive Seeding Script
═══════════════════════════════════════════════════════════

🔍 Validating environment configuration...

✓ Environment configuration valid
✓ SANDBOX_MODE: true
✓ Storage Account: lmlsandboxstorage

📁 Creating folder structure...

[SANDBOX] SharePoint service initialized with driveId: sandbox-drive-001
[SANDBOX] Listing children of folder: root
[SANDBOX] Found 2 children
⊙ Folder already exists: "Work Orders" [ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890]
[SANDBOX] Listing children of folder: root
[SANDBOX] Found 2 children
⊙ Folder already exists: "Proposals" [ID: b2c3d4e5-f6a7-8901-bcde-f12345678901]

📂 Work Orders/WO-2024-001
[SANDBOX] Listing children of folder: a1b2c3d4-e5f6-7890-abcd-ef1234567890
[SANDBOX] Found 2 children
  ⊙ Folder already exists: "WO-2024-001" [ID: c3d4e5f6-a7b8-9012-cdef-123456789012]
[SANDBOX] Listing children of folder: c3d4e5f6-a7b8-9012-cdef-123456789012
[SANDBOX] Found 3 children
    ⊙ Folder already exists: "Documents" [ID: d4e5f6a7-b8c9-0123-def1-234567890123]
[SANDBOX] Listing children of folder: c3d4e5f6-a7b8-9012-cdef-123456789012
[SANDBOX] Found 3 children
    ⊙ Folder already exists: "Photos" [ID: e5f6a7b8-c9d0-1234-ef12-345678901234]
[SANDBOX] Listing children of folder: c3d4e5f6-a7b8-9012-cdef-123456789012
[SANDBOX] Found 3 children
    ⊙ Folder already exists: "Reports" [ID: f6a7b8c9-d0e1-2345-f123-456789012345]

📂 Work Orders/WO-2024-002
[SANDBOX] Listing children of folder: a1b2c3d4-e5f6-7890-abcd-ef1234567890
[SANDBOX] Found 2 children
  ⊙ Folder already exists: "WO-2024-002" [ID: a7b8c9d0-e1f2-3456-1234-567890123456]
[SANDBOX] Listing children of folder: a7b8c9d0-e1f2-3456-1234-567890123456
[SANDBOX] Found 2 children
    ⊙ Folder already exists: "Documents" [ID: b8c9d0e1-f2a3-4567-2345-678901234567]
[SANDBOX] Listing children of folder: a7b8c9d0-e1f2-3456-1234-567890123456
[SANDBOX] Found 2 children
    ⊙ Folder already exists: "Photos" [ID: c9d0e1f2-a3b4-5678-3456-789012345678]

📂 Proposals
[SANDBOX] Listing children of folder: b2c3d4e5-f6a7-8901-bcde-f12345678901
[SANDBOX] Found 2 children
  ⊙ Folder already exists: "PROP-2024-001" [ID: d0e1f2a3-b4c5-6789-4567-890123456789]
[SANDBOX] Listing children of folder: b2c3d4e5-f6a7-8901-bcde-f12345678901
[SANDBOX] Found 2 children
  ⊙ Folder already exists: "PROP-2024-002" [ID: e1f2a3b4-c5d6-7890-5678-901234567890]

📄 Uploading placeholder files...

[SANDBOX] Listing children of folder: d4e5f6a7-b8c9-0123-def1-234567890123
[SANDBOX] Found 2 children
    ⊙ File already exists: "Technical-Specification-Draft.pdf" [ID: f2a3b4c5-d6e7-8901-6789-012345678901]
[SANDBOX] Listing children of folder: d4e5f6a7-b8c9-0123-def1-234567890123
[SANDBOX] Found 2 children
    ⊙ File already exists: "Contract-Template.pdf" [ID: a3b4c5d6-e7f8-9012-7890-123456789012]
[SANDBOX] Listing children of folder: f6a7b8c9-d0e1-2345-f123-456789012345
[SANDBOX] Found 1 children
    ⊙ File already exists: "Site-Inspection-Report.pdf" [ID: b4c5d6e7-f8a9-0123-8901-234567890123]

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

## Error Example: Missing Environment Variables

```
═══════════════════════════════════════════════════════════
  SharePoint Sandbox Drive Seeding Script
═══════════════════════════════════════════════════════════

🔍 Validating environment configuration...

❌ ERROR: SANDBOX_MODE must be set to 'true' to run this script
   Set SANDBOX_MODE=true in api/local.settings.json under Values section
```

## Error Example: Missing Required Packages

```
Error: Cannot find module 'uuid'
Require stack:
- C:\Users\leahmartinez\lml-file-management\api\src\services\sandboxSharePointService.ts
- C:\Users\leahmartinez\lml-file-management\api\src\services\sharePointServiceFactory.ts
- C:\Users\leahmartinez\lml-file-management\api\scripts\seedSandboxDrive.ts

Solution: Run the following commands:
  cd api
  npm install uuid @azure/storage-blob
  npm install --save-dev @types/uuid
```

## Notes on Output

### Color Coding

- **Green (✓)**: Successfully created or completed operations
- **Yellow (⊙)**: Skipped operations (item already exists)
- **Blue**: Section headers and informational messages
- **Cyan**: Main script title and configuration info
- **Red (❌)**: Errors and failures

### Logging Levels

The script outputs two types of logs:

1. **[SANDBOX] prefixed logs**: Low-level service operations from `SandboxSharePointService`
2. **Script-level logs**: High-level progress indicators with visual symbols

### Item IDs

All item IDs are UUIDs (v4) generated by the service. These IDs:
- Are unique across all items
- Persist across script runs (idempotent)
- Can be used directly in API endpoint paths
- Are stored in both Table Storage (rowKey) and Blob Storage (part of blob path)
