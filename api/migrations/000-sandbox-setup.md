# Migration 000: Sandbox SharePoint Setup

**Date:** April 15, 2026
**Type:** Infrastructure Setup
**Related Schema:** `docs/SCHEMA_SHAREPOINT_SANDBOX.md`

---

## Purpose

This migration sets up the Azure infrastructure required for the SharePoint sandbox environment:
- Azure Blob Storage container for file storage
- Azure Data Tables table for file/folder metadata
- Initial environment variable configuration

This is a **one-time setup** per developer environment, not a database migration script.

---

## Prerequisites

1. Azure CLI installed and authenticated
2. Azure subscription with Owner or Contributor access
3. Node.js environment with access to Azure SDK

---

## Migration Steps

### Step 1: Create Azure Resource Group

```bash
# Create resource group in Australia East region
az group create \
  --name lml-sandbox-rg \
  --location australiaeast \
  --tags environment=development purpose=sharepoint-sandbox
```

**Expected Output:**
```json
{
  "id": "/subscriptions/{subscription-id}/resourceGroups/lml-sandbox-rg",
  "location": "australiaeast",
  "name": "lml-sandbox-rg",
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

---

### Step 2: Create Azure Storage Account

```bash
# Create storage account with LRS redundancy
az storage account create \
  --name lmlsandboxstorage \
  --resource-group lml-sandbox-rg \
  --location australiaeast \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --tags environment=development purpose=sharepoint-sandbox
```

**Storage Account Naming Rules:**
- Must be globally unique
- 3-24 characters, lowercase letters and numbers only
- If `lmlsandboxstorage` is taken, try `lmlsandbox{yourname}` or `lmlsandbox{random}`

**Expected Output:**
```json
{
  "name": "lmlsandboxstorage",
  "location": "australiaeast",
  "provisioningState": "Succeeded",
  "primaryEndpoints": {
    "blob": "https://lmlsandboxstorage.blob.core.windows.net/",
    "table": "https://lmlsandboxstorage.table.core.windows.net/"
  }
}
```

---

### Step 3: Create Blob Container

```bash
# Create private blob container
az storage container create \
  --name sandbox-sharepoint-drive \
  --account-name lmlsandboxstorage \
  --public-access off \
  --auth-mode login
```

**Expected Output:**
```json
{
  "created": true
}
```

**Verify container:**
```bash
az storage container show \
  --name sandbox-sharepoint-drive \
  --account-name lmlsandboxstorage \
  --auth-mode login
```

---

### Step 4: Create Table Storage Table

```bash
# Create table for drive items
az storage table create \
  --name SandboxDriveItems \
  --account-name lmlsandboxstorage \
  --auth-mode login
```

**Expected Output:**
```json
{
  "created": true
}
```

**Verify table:**
```bash
az storage table list \
  --account-name lmlsandboxstorage \
  --auth-mode login
```

---

### Step 5: Retrieve Storage Account Keys

```bash
# Get storage account connection string
az storage account show-connection-string \
  --name lmlsandboxstorage \
  --resource-group lml-sandbox-rg \
  --output tsv
```

**Save the output** - this is your `SANDBOX_STORAGE_CONNECTION_STRING`

```bash
# Get storage account key
az storage account keys list \
  --name lmlsandboxstorage \
  --resource-group lml-sandbox-rg \
  --query '[0].value' \
  --output tsv
```

**Save the output** - this is your `SANDBOX_STORAGE_ACCOUNT_KEY`

---

### Step 6: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Sandbox SharePoint Configuration
SANDBOX_MODE=true

# Azure AD (use your own dev tenant - NOT org tenant)
SANDBOX_SP_TENANT_ID=<your-dev-tenant-id>
SANDBOX_SP_CLIENT_ID=<your-app-registration-client-id>
SANDBOX_SP_CLIENT_SECRET=<your-app-registration-secret>

# Azure Storage (from steps above)
SANDBOX_STORAGE_CONNECTION_STRING=<connection-string-from-step-5>
SANDBOX_STORAGE_ACCOUNT_NAME=lmlsandboxstorage
SANDBOX_STORAGE_ACCOUNT_KEY=<account-key-from-step-5>

# Sandbox Drive/Site IDs (fake values for dev)
SANDBOX_SP_DRIVE_ID=sandbox-drive-001
SANDBOX_SP_SITE_ID=sandbox-site-001
```

**Note:** If you don't have a personal Azure AD tenant for MSAL testing, you can create one for free:

```bash
# Create a new Azure AD tenant (optional)
# Visit: https://portal.azure.com/#create/Microsoft.AzureActiveDirectory
# Or use your existing dev tenant
```

---

### Step 7: Verify Setup

Run the following TypeScript script to verify all resources are accessible:

**File:** `api/scripts/verifySandboxSetup.ts`

```typescript
import { TableClient } from '@azure/data-tables';
import { BlobServiceClient } from '@azure/storage-blob';

async function verifySandboxSetup() {
  console.log('🔍 Verifying sandbox setup...\n');

  const connectionString = process.env.SANDBOX_STORAGE_CONNECTION_STRING;
  const accountName = process.env.SANDBOX_STORAGE_ACCOUNT_NAME;
  const driveId = process.env.SANDBOX_SP_DRIVE_ID;

  if (!connectionString || !accountName || !driveId) {
    throw new Error('Missing required environment variables. Check .env.local');
  }

  try {
    // Verify Table Storage
    console.log('📋 Checking Table Storage...');
    const tableClient = TableClient.fromConnectionString(
      connectionString,
      'SandboxDriveItems'
    );
    await tableClient.listEntities().next();
    console.log('✅ Table Storage: SandboxDriveItems table exists\n');

    // Verify Blob Storage
    console.log('📦 Checking Blob Storage...');
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient('sandbox-sharepoint-drive');
    const exists = await containerClient.exists();

    if (!exists) {
      throw new Error('Blob container does not exist');
    }
    console.log('✅ Blob Storage: sandbox-sharepoint-drive container exists\n');

    // Verify environment variables
    console.log('⚙️  Checking environment variables...');
    console.log(`✅ SANDBOX_MODE: ${process.env.SANDBOX_MODE}`);
    console.log(`✅ SANDBOX_STORAGE_ACCOUNT_NAME: ${accountName}`);
    console.log(`✅ SANDBOX_SP_DRIVE_ID: ${driveId}`);
    console.log(`✅ SANDBOX_SP_SITE_ID: ${process.env.SANDBOX_SP_SITE_ID}\n`);

    console.log('🎉 Sandbox setup verification complete! All resources are ready.\n');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  verifySandboxSetup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
```

**Run the verification:**
```bash
npx ts-node api/scripts/verifySandboxSetup.ts
```

---

## Post-Migration Validation

After completing all steps, verify:

1. ✅ Resource group `lml-sandbox-rg` exists in Azure Portal
2. ✅ Storage account `lmlsandboxstorage` exists in resource group
3. ✅ Blob container `sandbox-sharepoint-drive` exists with Private access level
4. ✅ Table `SandboxDriveItems` exists in storage account
5. ✅ All environment variables set in `.env.local`
6. ✅ Verification script runs without errors

---

## Rollback Strategy

If you need to tear down the sandbox environment:

```bash
# WARNING: This deletes ALL sandbox data permanently

# Delete the entire resource group (including storage account, container, table)
az group delete \
  --name lml-sandbox-rg \
  --yes \
  --no-wait

# Remove environment variables from .env.local
# (manually delete the SANDBOX_* lines)
```

**Rollback Impact:**
- All sandbox files and metadata are permanently deleted
- No impact on production data (sandbox is isolated)
- Can re-run migration to recreate sandbox environment

---

## Cost Estimate

**Azure Storage Costs (Australia East region):**

| Resource | Estimated Cost | Notes |
|----------|----------------|-------|
| Blob Storage (LRS) | ~$0.02/GB/month | First 50 GB |
| Table Storage | ~$0.10/million transactions | Dev usage: <1000/day |
| Data Transfer | Free | Within Azure region |
| **Total Estimated** | **<$1/month** | For typical dev usage |

**Cost Optimization:**
- Use LRS (Locally Redundant Storage) for dev - no geo-redundancy needed
- Delete sandbox data when not in use
- Set up Azure Cost Alerts at $5/month threshold

---

## Troubleshooting

### Issue: Storage account name already taken

**Error:** `The storage account named 'lmlsandboxstorage' is already taken.`

**Solution:**
```bash
# Use a unique name with your initials or random suffix
az storage account create \
  --name lmlsandboxjd123 \
  --resource-group lml-sandbox-rg \
  --location australiaeast \
  --sku Standard_LRS
```

Update `SANDBOX_STORAGE_ACCOUNT_NAME` in `.env.local` to match.

---

### Issue: Connection string not working

**Error:** `Invalid connection string format`

**Solution:**
1. Ensure connection string includes `AccountName`, `AccountKey`, and `DefaultEndpointsProtocol`
2. Re-run the key retrieval command:
   ```bash
   az storage account show-connection-string \
     --name lmlsandboxstorage \
     --resource-group lml-sandbox-rg
   ```
3. Copy the **entire** connection string (including quotes if present)

---

### Issue: Table/Container not found

**Error:** `ResourceNotFound: The specified resource does not exist`

**Solution:**
1. Verify resource exists:
   ```bash
   az storage table list --account-name lmlsandboxstorage
   az storage container list --account-name lmlsandboxstorage
   ```
2. If missing, re-run Step 3 or Step 4
3. Check that you're using the correct storage account name

---

### Issue: Authentication failed

**Error:** `AuthenticationFailed: Server failed to authenticate the request`

**Solution:**
1. Verify account key is correct:
   ```bash
   az storage account keys list \
     --name lmlsandboxstorage \
     --resource-group lml-sandbox-rg
   ```
2. Ensure no extra whitespace in `.env.local`
3. Restart your development server to reload environment variables

---

## Next Steps

After completing this migration:

1. ✅ Run the seed script to populate test data:
   ```bash
   npx ts-node api/scripts/seedSandboxDrive.ts
   ```

2. ✅ Implement `SandboxSharePointService` (see `sharepoint-sandbox.md` Phase 4)

3. ✅ Implement Azure Function endpoints (see `sharepoint-sandbox.md` Phase 6)

4. ✅ Run integration tests

5. ✅ Switch frontend to use sandbox by setting `SANDBOX_MODE=true`

---

## Related Documentation

- **Schema:** `docs/SCHEMA_SHAREPOINT_SANDBOX.md` - Complete storage architecture
- **Types:** `shared/types/sandboxSharePoint.ts` - TypeScript type definitions
- **Setup Guide:** `docs/SANDBOX_SETUP.md` - Developer setup instructions (to be created)
- **Seed Script:** `api/scripts/seedSandboxDrive.ts` - Test data population (to be created)

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-04-15 | 1.0 | Initial migration guide created | azure-db-schema-architect |
