# Troubleshooting 500 Error on /api/initialize

## Step 1: Check Function Logs in Azure Portal

The most important step is to see the actual error message:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Static Web App: `your-swa-app`
3. In the left menu, click **Functions**
4. Click on the **initialize** function
5. Click on **Monitor** tab (or **Logs** if available)
6. Look for recent error messages - they will tell you exactly what's wrong

Common errors you might see:
- `AZURE_STORAGE_CONNECTION_STRING not configured` - Environment variable is missing
- `Invalid connection string` - Connection string is malformed
- `Storage account not found` - Storage account doesn't exist or is inaccessible
- `Access denied` - Storage account permissions issue

## Step 2: Verify Environment Variables Are Set

1. In Azure Portal → Your Static Web App → **Configuration** → **Application settings**
2. Verify these three settings exist and have values:

   ✅ **AZURE_STORAGE_CONNECTION_STRING**
   - Should look like: `DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net`
   - Must NOT be empty
   - Must NOT be `your-connection-string-here` or placeholder text

   ✅ **JWT_SECRET**
   - Should be a long random string (base64 encoded)
   - Must NOT be empty
   - Must NOT be `your-jwt-secret-here` or placeholder text

   ✅ **ALLOWED_ORIGINS**
   - Should be: `https://your-app.azurestaticapps.net`
   - Can include multiple origins separated by commas

3. If any are missing or have placeholder values, **add/update them** and click **Save**

## Step 3: Verify Storage Account Exists

1. Go to Azure Portal → **Storage accounts**
2. Find the storage account you're using
3. Verify it exists and is in the same subscription
4. Check that it's not deleted or disabled

If you don't have a storage account yet:

1. Click **Create** → **Storage account**
2. Fill in:
   - **Subscription**: Your subscription
   - **Resource group**: Same as your Static Web App (or create new)
   - **Storage account name**: Must be globally unique (e.g., `lmlstorage123`)
   - **Region**: Same region as your Static Web App (recommended)
   - **Performance**: Standard
   - **Redundancy**: LRS (Locally redundant storage) is fine
3. Click **Review + create** → **Create**
4. Wait for creation to complete
5. Go to **Access keys** → Copy the **Connection string**
6. Add it to your Static Web App configuration

## Step 4: Test the Connection String

You can test if your connection string works using Azure CLI:

```powershell
# Install Azure CLI if needed: winget install -e --id Microsoft.AzureCLI

# Login
az login

# Test connection (replace with your connection string)
az storage table list --connection-string "YOUR_CONNECTION_STRING_HERE"
```

If this fails, your connection string is incorrect.

## Step 5: Check Deployment Status

1. Go to Azure Portal → Your Static Web App → **Deployment history**
2. Verify the latest deployment succeeded
3. Check GitHub Actions → Latest workflow run
4. Look for any build errors

## Step 6: Wait and Retry

After setting environment variables:
1. Click **Save** in Azure Portal
2. Wait **3-5 minutes** for changes to propagate
3. Try the initialize endpoint again:
   ```
   https://your-app.azurestaticapps.net/api/initialize
   ```

## Step 7: Enable Application Insights (Optional but Recommended)

For better error visibility:

1. Azure Portal → Your Static Web App → **Application Insights**
2. Click **Enable Application Insights**
3. Create new or use existing Application Insights resource
4. This will give you detailed error logs and traces

## Common Issues and Solutions

### Issue: "AZURE_STORAGE_CONNECTION_STRING not configured"
**Solution**: Add the environment variable in Azure Portal → Configuration → Application settings

### Issue: "Invalid connection string format"
**Solution**: 
- Get a fresh connection string from Storage Account → Access keys
- Make sure you copy the entire string (it's long!)
- Don't add extra spaces or characters

### Issue: "Storage account not found"
**Solution**:
- Verify the storage account exists
- Check it's in the same subscription
- Verify the account name in the connection string is correct

### Issue: "Access denied" or "Forbidden"
**Solution**:
- Check storage account firewall settings
- Ensure "Allow Azure services on the trusted services list to access this storage account" is enabled
- Or add your Static Web App's outbound IP to the firewall allow list

### Issue: Still getting 500 after setting variables
**Solution**:
1. Check function logs (Step 1 above) - this will show the exact error
2. Verify you clicked "Save" after adding variables
3. Wait 5 minutes and try again
4. Try triggering a new deployment

## Quick Checklist

Before calling `/api/initialize`, verify:

- [ ] Storage account exists in Azure
- [ ] AZURE_STORAGE_CONNECTION_STRING is set in Azure Portal
- [ ] Connection string is valid (not a placeholder)
- [ ] JWT_SECRET is set in Azure Portal
- [ ] JWT_SECRET is not a placeholder
- [ ] ALLOWED_ORIGINS is set in Azure Portal
- [ ] All settings were saved in Azure Portal
- [ ] Waited 3-5 minutes after saving
- [ ] Checked function logs for specific error message

## Still Not Working?

If you've checked everything above and it's still not working:

1. **Share the error message from function logs** - This is the most important information
2. **Verify the storage account connection string** - Test it with Azure CLI
3. **Check if the storage account is in a different subscription** - This can cause access issues
4. **Try creating a new storage account** - Sometimes there are permission issues with existing accounts




