/**
 * SharePoint Sandbox Drive Seeding Script
 *
 * This script populates the SharePoint sandbox environment with realistic test data
 * to allow developers to test SharePoint integration functionality without requiring
 * access to the real organization SharePoint instance.
 *
 * ## Purpose
 *
 * Creates a representative folder structure and sample files matching the expected
 * real-world SharePoint organization:
 *
 * ```
 * root/
 *   Work Orders/
 *     WO-2024-001/
 *       Documents/
 *       Photos/
 *       Reports/
 *     WO-2024-002/
 *       Documents/
 *       Photos/
 *   Proposals/
 *     PROP-2024-001/
 *     PROP-2024-002/
 * ```
 *
 * ## Features
 *
 * - **Idempotent**: Safe to run multiple times - checks for existing folders/files
 * - **Detailed logging**: Shows all created item IDs for manual API testing
 * - **Realistic data**: Creates placeholder PDF files with metadata
 * - **Error handling**: Graceful failures with clear error messages
 *
 * ## Prerequisites
 *
 * Install required dependencies (if not already present):
 *
 * ```bash
 * cd api
 * npm install uuid @azure/storage-blob
 * npm install --save-dev @types/uuid
 * ```
 *
 * ## Usage
 *
 * ```bash
 * cd api
 * npx ts-node scripts/seedSandboxDrive.ts
 * ```
 *
 * ## Requirements
 *
 * Ensure the following environment variables are set in `api/local.settings.json`:
 *
 * - `SANDBOX_MODE=true`
 * - `SANDBOX_STORAGE_CONNECTION_STRING`
 * - `SANDBOX_STORAGE_ACCOUNT_NAME`
 * - `SANDBOX_STORAGE_ACCOUNT_KEY`
 * - `SANDBOX_SP_DRIVE_ID` (optional, defaults to 'sandbox-drive-001')
 *
 * ## Output
 *
 * The script logs all created item IDs which can be used for manual testing
 * of the SharePoint API endpoints.
 */

import * as path from 'path';
import { getSharePointService } from '../src/services/sharePointServiceFactory';
import { DriveItem } from '../src/services/types/sharepoint';

// Load environment variables from local.settings.json
const localSettingsPath = path.join(__dirname, '..', 'local.settings.json');
try {
  const settings = require(localSettingsPath);
  if (settings.Values) {
    Object.keys(settings.Values).forEach((key) => {
      process.env[key] = settings.Values[key];
    });
  }
} catch (error) {
  console.warn('⚠️  Could not load local.settings.json, using existing environment variables');
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Validate environment configuration
 */
function validateEnvironment(): void {
  console.log(`${colors.cyan}🔍 Validating environment configuration...${colors.reset}\n`);

  if (process.env.SANDBOX_MODE !== 'true') {
    console.error(
      `${colors.red}❌ ERROR: SANDBOX_MODE must be set to 'true' to run this script${colors.reset}`
    );
    console.error(
      `   Set SANDBOX_MODE=true in api/local.settings.json under Values section\n`
    );
    process.exit(1);
  }

  const requiredVars = [
    'SANDBOX_STORAGE_CONNECTION_STRING',
    'SANDBOX_STORAGE_ACCOUNT_NAME',
    'SANDBOX_STORAGE_ACCOUNT_KEY',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(
      `${colors.red}❌ ERROR: Missing required environment variables:${colors.reset}`
    );
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error(`\n   Please configure these in api/local.settings.json\n`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Environment configuration valid${colors.reset}`);
  console.log(
    `${colors.green}✓ SANDBOX_MODE: ${process.env.SANDBOX_MODE}${colors.reset}`
  );
  console.log(
    `${colors.green}✓ Storage Account: ${process.env.SANDBOX_STORAGE_ACCOUNT_NAME}${colors.reset}\n`
  );
}

/**
 * Check if a folder with the given name exists under the parent
 */
async function findFolderByName(
  service: any,
  parentId: string | 'root',
  folderName: string
): Promise<DriveItem | null> {
  const children = await service.listFolderChildren(parentId);
  const folder = children.find(
    (item: DriveItem) => item.folder && item.name === folderName
  );
  return folder || null;
}

/**
 * Check if a file with the given name exists under the parent
 */
async function findFileByName(
  service: any,
  parentId: string,
  fileName: string
): Promise<DriveItem | null> {
  const children = await service.listFolderChildren(parentId);
  const file = children.find(
    (item: DriveItem) => item.file && item.name === fileName
  );
  return file || null;
}

/**
 * Create a folder, or return existing if already present
 */
async function createOrGetFolder(
  service: any,
  parentId: string | 'root',
  folderName: string,
  depth: number = 0
): Promise<DriveItem> {
  const indent = '  '.repeat(depth);

  // Check if folder already exists
  const existing = await findFolderByName(service, parentId, folderName);

  if (existing) {
    console.log(
      `${indent}${colors.yellow}⊙ Folder already exists: "${folderName}" [ID: ${existing.id}]${colors.reset}`
    );
    return existing;
  }

  // Create new folder
  const folder = await service.createFolder(parentId, folderName);
  console.log(
    `${indent}${colors.green}✓ Created folder: "${folderName}" [ID: ${folder.id}]${colors.reset}`
  );

  return folder;
}

/**
 * Upload a file, or skip if already present
 */
async function uploadOrSkipFile(
  service: any,
  parentId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
  metadata: any,
  depth: number = 0
): Promise<DriveItem | null> {
  const indent = '  '.repeat(depth);

  // Check if file already exists
  const existing = await findFileByName(service, parentId, fileName);

  if (existing) {
    console.log(
      `${indent}${colors.yellow}⊙ File already exists: "${fileName}" [ID: ${existing.id}]${colors.reset}`
    );
    return existing;
  }

  // Upload new file
  const file = await service.uploadFile(parentId, fileName, buffer, mimeType, metadata);
  console.log(
    `${indent}${colors.green}✓ Uploaded file: "${fileName}" [ID: ${file.id}, Size: ${buffer.length} bytes]${colors.reset}`
  );

  return file;
}

/**
 * Generate a simple placeholder PDF buffer
 */
function createPlaceholderPDF(title: string, content: string): Buffer {
  // This is a minimal valid PDF structure
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
50 700 Td
(${title}) Tj
0 -20 Td
(${content}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
467
%%EOF`;

  return Buffer.from(pdfContent, 'utf-8');
}

/**
 * Main seeding function
 */
async function seedSandboxDrive(): Promise<void> {
  console.log(
    `\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.cyan}  SharePoint Sandbox Drive Seeding Script${colors.reset}`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`
  );

  validateEnvironment();

  let service;
  try {
    service = getSharePointService();
  } catch (error: any) {
    console.error(`${colors.red}❌ Failed to initialize SharePoint service:${colors.reset}`);
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }

  console.log(
    `${colors.blue}📁 Creating folder structure...${colors.reset}\n`
  );

  try {
    // =========================================================================
    // Root level folders
    // =========================================================================

    const workOrdersFolder = await createOrGetFolder(service, 'root', 'Work Orders', 0);
    const proposalsFolder = await createOrGetFolder(service, 'root', 'Proposals', 0);

    console.log(); // Blank line for readability

    // =========================================================================
    // Work Orders structure
    // =========================================================================

    console.log(`${colors.blue}📂 Work Orders/WO-2024-001${colors.reset}`);
    const wo001Folder = await createOrGetFolder(
      service,
      workOrdersFolder.id,
      'WO-2024-001',
      1
    );

    const wo001DocsFolder = await createOrGetFolder(
      service,
      wo001Folder.id,
      'Documents',
      2
    );
    const wo001PhotosFolder = await createOrGetFolder(
      service,
      wo001Folder.id,
      'Photos',
      2
    );
    const wo001ReportsFolder = await createOrGetFolder(
      service,
      wo001Folder.id,
      'Reports',
      2
    );

    console.log(); // Blank line

    console.log(`${colors.blue}📂 Work Orders/WO-2024-002${colors.reset}`);
    const wo002Folder = await createOrGetFolder(
      service,
      workOrdersFolder.id,
      'WO-2024-002',
      1
    );

    const wo002DocsFolder = await createOrGetFolder(
      service,
      wo002Folder.id,
      'Documents',
      2
    );
    const wo002PhotosFolder = await createOrGetFolder(
      service,
      wo002Folder.id,
      'Photos',
      2
    );

    console.log(); // Blank line

    // =========================================================================
    // Proposals structure
    // =========================================================================

    console.log(`${colors.blue}📂 Proposals${colors.reset}`);
    const prop001Folder = await createOrGetFolder(
      service,
      proposalsFolder.id,
      'PROP-2024-001',
      1
    );
    const prop002Folder = await createOrGetFolder(
      service,
      proposalsFolder.id,
      'PROP-2024-002',
      1
    );

    console.log(); // Blank line

    // =========================================================================
    // Upload placeholder files
    // =========================================================================

    console.log(
      `${colors.blue}📄 Uploading placeholder files...${colors.reset}\n`
    );

    // Files for WO-2024-001/Documents
    const techSpecPDF = createPlaceholderPDF(
      'Technical Specification',
      'Draft specification for lift modernisation project.'
    );

    await uploadOrSkipFile(
      service,
      wo001DocsFolder.id,
      'Technical-Specification-Draft.pdf',
      techSpecPDF,
      'application/pdf',
      {
        originalName: 'Technical-Specification-Draft.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'seed-script',
        workOrderId: 'WO-2024-001',
        createdAt: new Date().toISOString(),
      },
      2
    );

    const contractPDF = createPlaceholderPDF(
      'Contract Document',
      'Standard lift maintenance contract template.'
    );

    await uploadOrSkipFile(
      service,
      wo001DocsFolder.id,
      'Contract-Template.pdf',
      contractPDF,
      'application/pdf',
      {
        originalName: 'Contract-Template.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'seed-script',
        workOrderId: 'WO-2024-001',
        createdAt: new Date().toISOString(),
      },
      2
    );

    // File for WO-2024-001/Reports
    const inspectionPDF = createPlaceholderPDF(
      'Site Inspection Report',
      'Initial site inspection findings and recommendations.'
    );

    await uploadOrSkipFile(
      service,
      wo001ReportsFolder.id,
      'Site-Inspection-Report.pdf',
      inspectionPDF,
      'application/pdf',
      {
        originalName: 'Site-Inspection-Report.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'seed-script',
        workOrderId: 'WO-2024-001',
        createdAt: new Date().toISOString(),
      },
      2
    );

    console.log(); // Blank line

    // =========================================================================
    // Summary
    // =========================================================================

    console.log(
      `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`
    );
    console.log(
      `${colors.green}✓ Sandbox drive seeding completed successfully!${colors.reset}`
    );
    console.log(
      `${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`
    );

    console.log(`${colors.blue}📊 Summary of Created Items:${colors.reset}\n`);

    console.log(`Root Folders:`);
    console.log(`  - Work Orders      [ID: ${workOrdersFolder.id}]`);
    console.log(`  - Proposals        [ID: ${proposalsFolder.id}]\n`);

    console.log(`Work Order Folders:`);
    console.log(`  - WO-2024-001      [ID: ${wo001Folder.id}]`);
    console.log(`    - Documents      [ID: ${wo001DocsFolder.id}]`);
    console.log(`    - Photos         [ID: ${wo001PhotosFolder.id}]`);
    console.log(`    - Reports        [ID: ${wo001ReportsFolder.id}]`);
    console.log(`  - WO-2024-002      [ID: ${wo002Folder.id}]`);
    console.log(`    - Documents      [ID: ${wo002DocsFolder.id}]`);
    console.log(`    - Photos         [ID: ${wo002PhotosFolder.id}]\n`);

    console.log(`Proposal Folders:`);
    console.log(`  - PROP-2024-001    [ID: ${prop001Folder.id}]`);
    console.log(`  - PROP-2024-002    [ID: ${prop002Folder.id}]\n`);

    console.log(
      `${colors.blue}💡 Use these IDs for manual API testing${colors.reset}\n`
    );

    console.log(`Example API calls:\n`);
    console.log(`  List WO-2024-001/Documents children:`);
    console.log(
      `    GET /api/sharepoint/folders/${wo001DocsFolder.id}/children\n`
    );
    console.log(`  Get download URL for a file:`);
    console.log(`    GET /api/sharepoint/items/{fileId}/download-url\n`);
    console.log(`  Delete an item:`);
    console.log(`    DELETE /api/sharepoint/items/{itemId}\n`);
  } catch (error: any) {
    console.error(
      `\n${colors.red}❌ Seeding failed with error:${colors.reset}`
    );
    console.error(`   ${error.message}`);

    if (error.stack) {
      console.error(`\n${colors.red}Stack trace:${colors.reset}`);
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the seeding script
seedSandboxDrive().catch((error) => {
  console.error(
    `\n${colors.red}❌ Unhandled error during seeding:${colors.reset}`
  );
  console.error(error);
  process.exit(1);
});
