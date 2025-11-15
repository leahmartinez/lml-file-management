# Troubleshooting "Function host is not running" (503 Error)

## Current Status

- ✅ Function App created: `liftwatch-api-7497`
- ✅ Environment variables configured
- ✅ Code deployed successfully
- ❌ Function host not starting (503 error)
- ⚠️ "Sync triggers" error during deployment

## Next Steps to Diagnose

### 1. Check Azure Portal Logs

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **Function App** → `liftwatch-api-7497`
3. In the left menu, click **Log stream** (under Monitoring)
4. Look for error messages that explain why the host isn't starting

### 2. Check Application Insights (If Enabled)

1. Azure Portal → Function App → **Application Insights**
2. Click **Logs** or **Failures**
3. Look for startup errors

### 3. Verify Function App Settings

Check these settings in Azure Portal → Configuration → Application settings:

- `FUNCTIONS_WORKER_RUNTIME` should be `node`
- `FUNCTIONS_EXTENSION_VERSION` should be `~4`
- `WEBSITE_NODE_DEFAULT_VERSION` should be `~20` (if set)

### 4. Check Deployment Structure

The deployment should include:
- ✅ `host.json` at the root
- ✅ `package.json` at the root
- ✅ Function folders with `function.json` files
- ✅ Compiled JavaScript files in function folders

### 5. Common Causes

1. **Missing `host.json`** - Fixed by updating build script
2. **Missing `package.json`** - Fixed by updating build script
3. **Node version mismatch** - Should be Node 20
4. **Dependency installation failure** - Check if `npm install` runs successfully
5. **Function.json syntax errors** - Verify all function.json files are valid

### 6. Try Restarting the Function App

```powershell
az functionapp restart --name liftwatch-api-7497 --resource-group liftwatch-rg
```

Wait 2-3 minutes, then test again.

### 7. Check Kudu Console

1. Azure Portal → Function App → **Advanced Tools (Kudu)**
2. Click **Go**
3. Navigate to `site/wwwroot`
4. Verify files are present:
   - `host.json`
   - `package.json`
   - Function folders

### 8. View Deployment Logs

1. Azure Portal → Function App → **Deployment Center**
2. Check deployment history
3. Look for errors in the deployment logs

## What We've Done

- ✅ Updated build script to copy `host.json` and `package.json` to `dist/`
- ✅ Verified environment variables are set
- ✅ Deployed code successfully
- ✅ Function App is in "Running" state

## Still Not Working?

The most likely issue is visible in the **Log stream** in Azure Portal. Check there first for specific error messages about why the function host isn't starting.

