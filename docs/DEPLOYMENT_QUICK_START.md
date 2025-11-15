# Quick Deployment Guide

## Current Situation

Your frontend is trying to connect to `http://localhost:7071/api` but the API server isn't running locally. You have two options:

---

## Option 1: Test Locally First (Recommended)

### Start the API Server

1. **Open a terminal** and navigate to the API directory:
   ```powershell
   cd api
   ```

2. **Start the API server**:
   ```powershell
   npm start
   ```
   
   You should see:
   ```
   Azure Functions Core Tools
   Functions:
           auth-login: [POST,OPTIONS] http://localhost:7071/api/auth/login
           users-list: [GET,OPTIONS] http://localhost:7071/api/users
           ...
   ```

3. **Keep that terminal open** - the API needs to keep running

4. **In another terminal**, start your frontend:
   ```powershell
   npm run dev
   ```

5. **Test login** with:
   - Email: `admin@liftwatch.com`
   - Password: `password`

---

## Option 2: Deploy to Azure (Production)

### Step 1: Deploy the API to Azure Functions

1. **Install Azure CLI** (if not already installed):
   ```powershell
   winget install -e --id Microsoft.AzureCLI
   ```

2. **Login to Azure**:
   ```powershell
   az login
   ```

3. **Set your variables**:
   ```powershell
   $RESOURCE_GROUP = "liftwatch-rg"
   $LOCATION = "australiaeast"
   $STORAGE_ACCOUNT = "liftwatchstorage"
   $FUNCTION_APP = "liftwatch-api"
   ```

4. **Create resources** (if they don't exist):
   ```powershell
   # Create resource group
   az group create --name $RESOURCE_GROUP --location $LOCATION

   # Create storage account
   az storage account create `
     --name $STORAGE_ACCOUNT `
     --location $LOCATION `
     --resource-group $RESOURCE_GROUP `
     --sku Standard_LRS

   # Create Function App
   az functionapp create `
     --resource-group $RESOURCE_GROUP `
     --consumption-plan-location $LOCATION `
     --runtime node `
     --runtime-version 20 `
     --functions-version 4 `
     --name $FUNCTION_APP `
     --storage-account $STORAGE_ACCOUNT `
     --os-type Linux
   ```

5. **Get storage connection string**:
   ```powershell
   $STORAGE_CONNECTION = az storage account show-connection-string `
     --name $STORAGE_ACCOUNT `
     --resource-group $RESOURCE_GROUP `
     --query connectionString `
     --output tsv
   ```

6. **Configure Function App settings**:
   ```powershell
   # Generate a secure JWT secret
   $JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

   # Set application settings
   az functionapp config appsettings set `
     --name $FUNCTION_APP `
     --resource-group $RESOURCE_GROUP `
     --settings `
       "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION" `
       "JWT_SECRET=$JWT_SECRET" `
       "ALLOWED_ORIGINS=https://jolly-moss-04de19b00.3.azurestaticapps.net,http://localhost:8080"
   ```

7. **Deploy the API**:
   ```powershell
   cd api
   npm run build
   func azure functionapp publish $FUNCTION_APP
   ```

8. **Initialize the database**:
   ```powershell
   $API_URL = "https://$FUNCTION_APP.azurewebsites.net"
   Invoke-RestMethod -Uri "$API_URL/api/initialize" -Method GET
   ```

### Step 2: Update Frontend Environment Variable

1. **Create `.env.production` file** in the root directory:
   ```
   VITE_API_BASE_URL=https://liftwatch-api-flex.azurewebsites.net/api
   ```

2. **Or set it in Azure Static Web Apps**:
   - Go to Azure Portal → Your Static Web App → Configuration
   - Add application setting:
     - Name: `VITE_API_BASE_URL`
     - Value: `https://liftwatch-api-flex.azurewebsites.net/api`

3. **Redeploy frontend** (push to main branch)

---

## Option 3: Use Azure Static Web Apps Built-in Auth (Alternative)

If you want to use Microsoft account login instead of custom authentication:

### Pros:
- ✅ No API deployment needed
- ✅ Users login with Microsoft/GitHub accounts
- ✅ Managed by Azure
- ✅ Free tier available

### Cons:
- ❌ Requires refactoring frontend
- ❌ Less control over user management
- ❌ Need to map Azure identities to your user roles

### How to Enable:

1. **In Azure Portal** → Your Static Web App → Authentication
2. **Click "Add identity provider"**
3. **Select "Microsoft"**
4. **Configure** (Azure will handle the rest)

### Frontend Changes Needed:

You'd need to:
- Use `@azure/static-web-apps-auth` package
- Replace custom login with Azure auth
- Map Azure user identities to your roles
- Store role assignments in a database

**This is a significant refactor** - probably not worth it since you already have the custom API working.

---

## Recommendation

**For now**: Test locally first (Option 1) to make sure everything works, then deploy (Option 2) when ready.

The custom API approach gives you:
- ✅ Full control over user management
- ✅ Custom roles and permissions
- ✅ Password-based login (no Microsoft account required)
- ✅ Already implemented and working

---

## Troubleshooting

### API won't start locally?
- Make sure Azure Functions Core Tools is installed: `func --version`
- Check if port 7071 is already in use
- Try: `npm install` in the `api` directory

### Connection refused?
- Make sure API server is running (`npm start` in `api` directory)
- Check the API is listening on port 7071
- Verify frontend is pointing to correct URL

### Deployment issues?
- Check Azure Functions logs in Azure Portal
- Verify all environment variables are set
- Make sure Function App is running (not stopped)

