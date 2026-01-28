# Fixing Node.js Version and 500 Errors in Azure Static Web Apps

## Quick Fix Guide

If you're seeing:
- `EBADENGINE Unsupported engine` warnings in deployment logs
- 500 Internal Server Error from `/api/profile` or other API endpoints

Follow these steps:

## Step 1: Set Node.js Version to 20

The Node.js version is configured in `staticwebapp.config.json`. This file should already have:

```json
{
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

**Note:** `WEBSITE_NODE_DEFAULT_VERSION` is NOT supported in Azure Static Web Apps. The Node version must be set via `staticwebapp.config.json` or the `.nvmrc` file in the `api/` directory.

## Step 2: Configure Required Environment Variables

Your API functions need these environment variables to work:

1. In the same **Configuration** → **Application settings** page:

### AZURE_STORAGE_CONNECTION_STRING
- **How to get it:**
  1. Go to Azure Portal → Your Storage Account
  2. Click **Access keys** in the left menu
  3. Click **Show** next to one of the connection strings
  4. Copy the entire connection string

### JWT_SECRET
- **Generate a secure secret:**
  - **PowerShell**: 
    ```powershell
    [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    ```
  - **Bash/Linux/Mac**:
    ```bash
    openssl rand -base64 32
    ```
  - Or use any secure random string generator

### ALLOWED_ORIGINS
- **Value**: `https://your-app.azurestaticapps.net,http://localhost:8080`
- Add your production domain and any development URLs

2. Click **Save** after adding all three settings

## Step 3: Initialize the Database

After setting the environment variables, initialize the database:

1. Open a browser or use curl:
   ```
   GET https://your-app.azurestaticapps.net/api/initialize
   ```

2. This will:
   - Create the Users table in Azure Table Storage
   - Create an initial admin user:
     - **Email**: `leah@lmllift.com`
     - **Password**: `password`

## Step 4: Verify the Fix

1. **Check deployment logs:**
   - Go to GitHub Actions → Latest workflow run
   - Verify no `EBADENGINE` warnings (or they should be gone after next deployment)

2. **Test the API:**
   - Try logging in with the admin credentials
   - Check browser console for errors
   - The `/api/profile` endpoint should now work

3. **Check function logs:**
   - Azure Portal → Your Static Web App → Functions
   - Click on `profile` function
   - Check "Monitor" or "Logs" tab for any errors

## Troubleshooting

### Still seeing Node 18 warnings?
- Verify `staticwebapp.config.json` has `"platform": { "apiRuntime": "node:20" }`
- Trigger a new deployment (push to main branch)
- The `.nvmrc` file in `api/` directory should also help

### Still getting 500 errors?
1. **Verify all environment variables are set:**
   - Check Azure Portal → Configuration → Application settings
   - All three variables should be present

2. **Check function logs for specific errors:**
   - Azure Portal → Functions → [function name] → Logs
   - Look for error messages that indicate what's missing

3. **Verify storage account:**
   - Ensure the storage account exists
   - Verify the connection string is correct
   - Check that the storage account is accessible

4. **Check authentication:**
   - Make sure you're sending the JWT token in the Authorization header
   - Format: `Authorization: Bearer <your-token>`

## What Changed?

- ✅ Added `.nvmrc` file in `api/` directory (specifies Node 20)
- ✅ Updated documentation with Node version configuration steps
- ✅ Added troubleshooting guide for 500 errors

The `.nvmrc` file will be automatically picked up by Azure Static Web Apps, but setting `WEBSITE_NODE_DEFAULT_VERSION` in the portal ensures it's used.



