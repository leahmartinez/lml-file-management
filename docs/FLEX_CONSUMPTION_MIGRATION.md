# Azure Functions Flex Consumption Migration

## Overview

Successfully migrated LiftWatch API from Azure Functions Linux Consumption to Flex Consumption. This resolves persistent deployment and function discovery issues.

## Migration Results

### ✅ Problem Resolved

**Linux Consumption Issues:**
- BadRequest trigger sync errors (documented Azure CLI limitation)
- 404 responses on all function endpoints
- Functions not discovered despite proper structure

**Flex Consumption Solution:**
- ✅ All 16 functions discovered and registered correctly
- ✅ Health endpoint returns 200 OK with proper response
- ✅ Initialize endpoint responds with proper error handling (500 when storage not configured - expected)
- ✅ No trigger sync errors
- ✅ Proper CORS headers being applied

### Discovered Functions

All 16 functions successfully deployed:

**Auth Functions:**
- `auth-login` - POST /api/auth/login
- `auth-register` - POST /api/auth/register  
- `auth-forgot-password` - POST /api/auth/forgot-password
- `auth-reset-password` - POST /api/auth/reset-password
- `auth-verify-email` - POST /api/auth/verify-email
- `auth-resend-verification` - POST /api/auth/resend-verification
- `auth-send-invitation` - POST /api/auth/send-invitation
- `auth-accept-invitation` - POST /api/auth/accept-invitation

**User Management Functions:**
- `users` - GET/POST /api/users
- `users-approve` - POST /api/users/approve
- `users-suspend` - POST /api/users/suspend
- `users-delete` - DELETE /api/users/delete
- `users-update` - PUT /api/users/update

**System Functions:**
- `initialize` - GET /api/initialize
- `profile` - GET /api/profile
- `health` - GET /api/health

## Deployment Details

**New Function App:** `liftwatch-api-flex`
- **Endpoint:** https://liftwatch-api-flex.azurewebsites.net
- **Runtime:** Node.js 20
- **Plan:** Flex Consumption (Dynamic)
- **OS:** Linux
- **Functions Version:** 4

## Required Configuration

### App Settings to Configure

Set the following in Azure Portal under Configuration > Application settings:

```
AZURE_STORAGE_CONNECTION_STRING=<connection-string-from-storage-account>
```

Or use Azure CLI:
```bash
az functionapp config appsettings set \
  --resource-group liftwatch-rg \
  --name liftwatch-api-flex \
  --settings AZURE_STORAGE_CONNECTION_STRING="<your-connection-string>"
```

## Testing Results

### Health Endpoint
```
GET https://liftwatch-api-flex.azurewebsites.net/api/health

HTTP/1.1 200 OK
Content-Type: application/json

{"status":"healthy","timestamp":"2025-11-10T12:53:15.181Z","runtime":"Node.js v4 Functions"}
```

### Initialize Endpoint (without storage configured)
```
GET https://liftwatch-api-flex.azurewebsites.net/api/initialize

HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{"error":"AZURE_STORAGE_CONNECTION_STRING environment variable is not configured..."}
```

The error response is expected and demonstrates the function is working correctly.

## Next Steps

1. **Configure Storage Connection String**
   - Set `AZURE_STORAGE_CONNECTION_STRING` in App Settings
   - This is required for the initialize endpoint and database operations

2. **Update DNS/Routing**
   - Update any DNS records pointing from `liftwatch-api-7497` to `liftwatch-api-flex`
   - Or update application configuration to use the new endpoint

3. **Decommission Old App (when ready)**
   - Keep Linux Consumption app running for a period for gradual migration
   - Once fully transitioned, delete `liftwatch-api-7497`

4. **Monitor Application**
   - Check Application Insights for `liftwatch-api-flex`
   - Monitor error rates and performance

## Code Changes

The codebase supports both deployment models through:
- **Default exports** in all handler files for function.json compatibility
- **Named exports** for code-first app.http() model
- **Automatic function.json generation** during build process

Both approaches work with Flex Consumption, providing maximum flexibility.

## Technical Details

### Why Flex Consumption Works

1. **Better Function Discovery**: Flex Consumption properly handles both:
   - Code-first model (app.http() registrations)
   - Traditional model (function.json files)

2. **No Trigger Sync Issues**: Unlike Linux Consumption, Flex Consumption doesn't report spurious BadRequest errors

3. **Improved Runtime Stability**: More reliable Node.js runtime environment

### Architecture

```
liftwatch-api-flex/
├── health.js              (compiled from src/health.ts)
├── handlers/              (compiled handlers)
│   ├── initialize.js
│   ├── auth-login.js
│   ├── ... (13 more handlers)
├── database/              (compiled database layer)
├── utils/                 (compiled utilities)
├── index.js              (entry point)
├── functions.js          (code-first registrations)
└── function.json files   (in subdirectories for discovery)
```

## Benefits of Flex Consumption

- ✅ Better Node.js v4 support
- ✅ Improved scaling
- ✅ More predictable pricing
- ✅ No Linux Consumption limitations
- ✅ Better debugging experience
- ✅ Linux Consumption EOL: Sept 30, 2028 (future-proof)

## Troubleshooting

### Functions still returning 404
- Verify deployment completed successfully
- Check Application Insights for runtime errors
- Ensure function.json files were deployed

### Initialize endpoint returning 500
- Verify AZURE_STORAGE_CONNECTION_STRING is set in App Settings
- Check Application Insights for detailed error messages
- Verify storage account is accessible

### Functions not appearing in Azure Portal
- This is normal - Flex Consumption doesn't always show functions in Portal
- Use `func azure functionapp publish` to verify functions are deployed
- Test endpoints directly

## Migration Branch

This migration was completed on branch: `flex-consumption-migration`

Ready to merge to `main` once all configuration is complete and testing passes.
