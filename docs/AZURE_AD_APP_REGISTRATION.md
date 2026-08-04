# Azure AD App Registration Guide

**Version:** 1.0
**Date:** April 15, 2026
**Purpose:** Guide for creating Azure AD app registrations for the SharePoint sandbox and production SharePoint integration

---

## Table of Contents

1. [Overview](#overview)
2. [When Do You Need This?](#when-do-you-need-this)
3. [Sandbox App Registration](#sandbox-app-registration)
4. [Production App Registration](#production-app-registration)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Azure AD (Active Directory) app registrations are required for authenticating your application to Microsoft services. This guide covers two scenarios:

1. **Sandbox mode** (optional) - Uses your personal Azure subscription for local development
2. **Production mode** (required) - Uses the organization's Azure AD tenant for accessing real SharePoint

---

## When Do You Need This?

### Sandbox Mode (Personal Azure Account)

**Do you need it?** ❌ **No, it's optional for the sandbox**

The SharePoint sandbox uses Azure Blob Storage and Table Storage for file operations, which authenticate using storage account keys (not Azure AD). However, creating an app registration is still useful for:

- Learning the process before production deployment
- Testing MSAL authentication flows
- Preparing for future Microsoft Graph API integrations beyond SharePoint

**If you skip this:** The sandbox will work fine using only `SANDBOX_STORAGE_CONNECTION_STRING`.

### Production Mode (Organization Azure AD)

**Do you need it?** ✅ **Yes, required for production SharePoint**

To access the organization's SharePoint via Microsoft Graph API, you **must** have an app registration in the organization's Azure AD tenant with the following:

- Client ID and Client Secret
- Tenant ID
- Delegated or Application permissions for SharePoint (e.g., `Sites.Read.All`, `Files.ReadWrite.All`)

**Who creates it?** Your organization's Azure AD administrator (you typically don't have permission to create this yourself).

---

## Sandbox App Registration

Create this in **your personal Azure subscription** (not the organization's tenant).

### Prerequisites

- [ ] Personal Azure account (free tier is sufficient)
- [ ] Azure CLI installed and authenticated (`az login`)
- [ ] OR access to the Azure Portal

---

### Option A: Azure Portal (GUI)

#### Step 1: Navigate to Azure Active Directory

1. Go to: https://portal.azure.com
2. Search for **"Azure Active Directory"** in the top search bar
3. Click **"App registrations"** in the left menu
4. Click **"+ New registration"**

#### Step 2: Configure App Registration

**Name:** `lml-portal-sandbox`

**Supported account types:**
- Select: **"Accounts in this organizational directory only (Single tenant)"**

**Redirect URI:**
- Leave blank (not needed for sandbox mode)

Click **"Register"**

#### Step 3: Copy Application IDs

On the **Overview** page, you'll see:

- **Application (client) ID**: `12345678-1234-1234-1234-123456789abc`
  - Save as `SANDBOX_SP_CLIENT_ID`

- **Directory (tenant) ID**: `87654321-4321-4321-4321-cba987654321`
  - Save as `SANDBOX_SP_TENANT_ID`

#### Step 4: Create Client Secret

1. In the left menu, click **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Enter:
   - **Description:** `lml-sandbox-dev-secret`
   - **Expires:** `24 months` (or your preferred duration)
4. Click **"Add"**
5. **IMPORTANT:** Copy the **Value** column immediately (not the Secret ID)
   - This is your `SANDBOX_SP_CLIENT_SECRET`
   - ⚠️ You cannot retrieve this value later — save it now!

#### Step 5: Configure API Permissions (Optional)

> **Note:** This step is optional for the sandbox but required for production SharePoint access.

1. Click **"API permissions"** in the left menu
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Application permissions"** (for daemon/service apps) or **"Delegated permissions"** (for user-impersonation scenarios)
5. Search for and add:
   - `Sites.Read.All` (read SharePoint sites)
   - `Files.ReadWrite.All` (read/write files in SharePoint)
6. Click **"Add permissions"**
7. Click **"Grant admin consent for [Your Directory]"** (requires admin role)

---

### Option B: Azure CLI (Command Line)

```bash
# Ensure you're logged in to the correct Azure account
az login
az account show

# Create the app registration
az ad app create \
  --display-name "lml-portal-sandbox" \
  --sign-in-audience "AzureADMyOrg"

# Get the app details
APP_LIST=$(az ad app list --display-name "lml-portal-sandbox")
echo $APP_LIST | jq .

# Extract the app ID (client ID)
APP_ID=$(echo $APP_LIST | jq -r '.[0].appId')
echo "✓ Client ID (SANDBOX_SP_CLIENT_ID): $APP_ID"

# Get the tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "✓ Tenant ID (SANDBOX_SP_TENANT_ID): $TENANT_ID"

# Create a service principal for the app
az ad sp create --id $APP_ID

# Create a client secret (valid for 2 years)
SECRET_OUTPUT=$(az ad app credential reset \
  --id $APP_ID \
  --append \
  --display-name "lml-sandbox-dev-secret" \
  --years 2)

echo $SECRET_OUTPUT | jq .

# Extract the client secret
CLIENT_SECRET=$(echo $SECRET_OUTPUT | jq -r '.password')
echo "✓ Client Secret (SANDBOX_SP_CLIENT_SECRET): $CLIENT_SECRET"

# IMPORTANT: Save these values now!
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Save these values in api/local.settings.json:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SANDBOX_SP_CLIENT_ID=$APP_ID"
echo "SANDBOX_SP_TENANT_ID=$TENANT_ID"
echo "SANDBOX_SP_CLIENT_SECRET=$CLIENT_SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

#### Optional: Add API Permissions via CLI

```bash
# Add Microsoft Graph API permissions
# Sites.Read.All (application permission)
az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions 332a536c-c7ef-4017-ab91-336970924f0d=Role

# Files.ReadWrite.All (application permission)
az ad app permission add \
  --id $APP_ID \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permission df85f4d6-205c-4ac5-a5ea-6bf408dba283=Role

# Grant admin consent (requires admin role)
az ad app permission admin-consent --id $APP_ID
```

**Permission ID Reference:**
- `00000003-0000-0000-c000-000000000000` = Microsoft Graph API
- `332a536c-c7ef-4017-ab91-336970924f0d` = Sites.Read.All (Application)
- `df85f4d6-205c-4ac5-a5ea-6bf408dba283` = Files.ReadWrite.All (Application)

---

### Step 6: Update Environment Variables

Add the values to `api/local.settings.json`:

```json
{
  "Values": {
    "SANDBOX_SP_CLIENT_ID": "12345678-1234-1234-1234-123456789abc",
    "SANDBOX_SP_CLIENT_SECRET": "your-client-secret-value",
    "SANDBOX_SP_TENANT_ID": "87654321-4321-4321-4321-cba987654321"
  }
}
```

---

## Production App Registration

This must be created by your **organization's Azure AD administrator** in the **organization's Azure AD tenant** (not your personal subscription).

### What to Request from Your Admin

Send this template to your Azure AD administrator:

---

**Subject:** Azure AD App Registration Request for LML Work Management Portal

**Body:**

Hi [Admin Name],

We need an Azure AD app registration for the LML Work Management Portal to access SharePoint via Microsoft Graph API.

**App Details:**
- **Name:** `lml-work-management-portal-prod` (or your preferred naming convention)
- **Account type:** Single tenant (organization directory only)
- **Redirect URIs:** (if using delegated permissions with user sign-in)
  - `https://your-production-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (for local testing)

**Required API Permissions (Microsoft Graph):**
- `Sites.Read.All` - Read all site collections
- `Files.ReadWrite.All` - Read and write files in all site collections
- Grant admin consent for these permissions

**Authentication:**
- Generate a **client secret** with 24-month expiration
- Provide the following values securely:
  - Application (client) ID
  - Directory (tenant) ID
  - Client secret value

**SharePoint Details:**
We also need:
- SharePoint site URL: `https://yourorg.sharepoint.com/sites/YourSite`
- Drive ID (can be retrieved via Graph API once we have credentials)

Please let me know when this is ready or if you need additional information.

Thank you!

---

### When You Receive the Credentials

Your admin will provide:

- `GRAPH_SP_CLIENT_ID` = Application (client) ID
- `GRAPH_SP_CLIENT_SECRET` = Client secret value
- `GRAPH_SP_TENANT_ID` = Directory (tenant) ID
- `SHAREPOINT_SITE_URL` = SharePoint site URL
- `SHAREPOINT_DRIVE_ID` = Drive ID (GUID)

Add these to your **production environment variables** (Azure Function App Settings):

```json
{
  "SANDBOX_MODE": "false",
  "GRAPH_SP_CLIENT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "GRAPH_SP_CLIENT_SECRET": "your-org-client-secret",
  "GRAPH_SP_TENANT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "SHAREPOINT_SITE_URL": "https://yourorg.sharepoint.com/sites/YourSite",
  "SHAREPOINT_DRIVE_ID": "b!abc123..."
}
```

---

## Environment Variables Reference

### Sandbox Mode Variables

```env
# Set to true to use sandbox (Azure Storage) instead of SharePoint
SANDBOX_MODE=true

# Azure AD app registration (optional for sandbox)
SANDBOX_SP_CLIENT_ID=12345678-1234-1234-1234-123456789abc
SANDBOX_SP_CLIENT_SECRET=your-client-secret-value
SANDBOX_SP_TENANT_ID=87654321-4321-4321-4321-cba987654321

# Azure Storage (required for sandbox)
SANDBOX_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
SANDBOX_STORAGE_ACCOUNT_NAME=lmlsandboxstorage
SANDBOX_STORAGE_ACCOUNT_KEY=your-storage-key

# Fake IDs for Graph API compatibility
SANDBOX_SP_DRIVE_ID=sandbox-drive-001
SANDBOX_SP_SITE_ID=sandbox-site-001
```

### Production Mode Variables

```env
# Set to false to use production SharePoint (Microsoft Graph API)
SANDBOX_MODE=false

# Azure AD app registration from organization (required for production)
GRAPH_SP_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GRAPH_SP_CLIENT_SECRET=your-org-client-secret
GRAPH_SP_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# SharePoint details from organization
SHAREPOINT_SITE_URL=https://yourorg.sharepoint.com/sites/YourSite
SHAREPOINT_DRIVE_ID=b!abc123...
```

---

## Security Best Practices

### 1. Protect Client Secrets

- ❌ **Never commit secrets to Git** (use `.gitignore` for `.env` and `local.settings.json`)
- ✅ Store secrets in Azure Key Vault for production
- ✅ Use environment variables or Azure App Settings
- ✅ Rotate secrets every 12-24 months

### 2. Principle of Least Privilege

- ❌ Don't request `Files.ReadWrite.All` if you only need `Files.Read.All`
- ✅ Only grant permissions that are actively used
- ✅ Use Application permissions (daemon) instead of Delegated if no user sign-in is needed

### 3. Secret Expiration

- ✅ Set client secret expiration to 12-24 months maximum
- ✅ Set calendar reminders to rotate secrets before expiry
- ✅ Have a process for rolling secrets without downtime

### 4. Monitoring and Auditing

- ✅ Enable Azure AD sign-in logs
- ✅ Monitor for failed authentication attempts
- ✅ Review app permissions quarterly

---

## Troubleshooting

### Issue: "AADSTS7000215: Invalid client secret is provided"

**Cause:** Client secret is incorrect, expired, or not properly copied.

**Solution:**
1. Verify the client secret in `api/local.settings.json` matches the Azure Portal value
2. Check for extra spaces or newlines
3. If secret is expired, generate a new one in Azure Portal → App Registration → Certificates & secrets

### Issue: "AADSTS50001: The application named X was not found in the tenant Y"

**Cause:** The app registration does not exist in the specified tenant.

**Solution:**
1. Verify `TENANT_ID` matches the tenant where the app is registered
2. Check that you're logged into the correct Azure account
3. Ensure the app registration was created successfully

### Issue: "Insufficient privileges to complete the operation"

**Cause:** The app registration does not have the required API permissions, or admin consent was not granted.

**Solution:**
1. Go to Azure Portal → App Registration → API permissions
2. Verify required permissions are listed (e.g., `Sites.Read.All`)
3. Click "Grant admin consent for [Tenant]" (requires admin role)
4. If you're not an admin, contact your Azure AD administrator

### Issue: "The app registration is not working in sandbox mode"

**Cause:** Sandbox mode does not use Azure AD authentication for SharePoint operations (it uses storage account keys instead).

**Solution:**
- Azure AD app registration is **optional** for sandbox mode
- Sandbox mode authenticates to Azure Storage using `SANDBOX_STORAGE_CONNECTION_STRING`
- You only need app registration for production SharePoint access

---

## Additional Resources

- **Azure AD App Registration Documentation:** https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
- **Microsoft Graph Permissions Reference:** https://docs.microsoft.com/en-us/graph/permissions-reference
- **Azure Key Vault for Secret Management:** https://docs.microsoft.com/en-us/azure/key-vault/
- **MSAL.js Authentication Library:** https://github.com/AzureAD/microsoft-authentication-library-for-js

---

**Version History:**

- **1.0** (April 15, 2026) - Initial release
