# Deployment Guide - Server-Side Authentication

My notes for deploying the new backend API with proper authentication.

## What I Need

- Azure subscription (already have)
- Azure CLI
- Node.js 20+
- About 2 hours

## What Gets Deployed

1. Azure Functions - handles authentication
2. Azure Table Storage - stores user data
3. Blob Storage - private files with secure access
4. Static Web App - existing frontend

---

## Part 1: Deploy Azure Functions API (45 minutes)

### Step 1.1: Set Up Azure Resources

```bash
# Login first
az login

# My settings
RESOURCE_GROUP="lml-rg"
LOCATION="australiaeast"  # Closest to Australia
STORAGE_ACCOUNT="lmlstorage"  # Must be unique globally
FUNCTION_APP="lml-api"  # Must be unique

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_LRS

# Create function app
az functionapp create \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name $FUNCTION_APP \
  --storage-account $STORAGE_ACCOUNT \
  --os-type Linux
```

**Expected output:** Function app URL will be displayed (e.g., `https://lml-api.azurewebsites.net`)

### Step 1.2: Configure Function App Settings

```bash
# Get storage connection string
STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

# Generate a secure JWT secret (save this!)
JWT_SECRET=$(openssl rand -base64 32)
echo "Your JWT Secret: $JWT_SECRET"  # SAVE THIS!

# Set application settings
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION" \
    "JWT_SECRET=$JWT_SECRET" \
    "ALLOWED_ORIGINS=http://localhost:8080,https://your-app.azurestaticapps.net"
```

### Step 1.3: Build and Deploy API

```bash
cd api

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Azure
func azure functionapp publish $FUNCTION_APP
```

**Expected output:**
```
Functions in lml-api:
    auth-login - [httpTrigger]
        Invoke url: https://lml-api.azurewebsites.net/api/auth/login

    users-list - [httpTrigger]
        Invoke url: https://lml-api.azurewebsites.net/api/users

    [... more functions ...]
```

### Step 1.4: Initialize Database

```bash
# Initialize database and seed admin user
curl https://lml-api.azurewebsites.net/api/initialize
```

**Expected response:**
```json
{
  "message": "Database initialized successfully",
  "info": "Initial admin user: leah@lmllift.com / password"
}
```

### Step 1.5: Test API

```bash
# Test login
curl -X POST https://lml-api.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leah@lmllift.com","password":"password"}'
```

**Expected response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "leah@lmllift.com",
    "role": "admin",
    "sites": []
  }
}
```

✅ **Part 1 Done!** Backend API is live.

---

## Part 2: Update Frontend to Use API (30 minutes)

### Step 2.1: Create API Configuration

```bash
cd ..  # Back to project root
```

Create `src/config/api.ts`:
```typescript
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://lml-api.azurewebsites.net/api'
  : 'http://localhost:7071/api';
```

### Step 2.2: Update useAuth Hook

The frontend updates are already prepared in the codebase. You'll need to:

1. Update `src/hooks/useAuth.tsx` to call API instead of localStorage
2. Update `src/pages/AdminPage.tsx` to use new API calls
3. Test locally with `npm run dev`

See `docs/FRONTEND_UPDATES.md` for detailed code changes.

### Step 2.3: Test Locally

```bash
# Terminal 1 - Run API locally
cd api
npm start

# Terminal 2 - Run frontend
cd ..
npm run dev
```

Open http://localhost:8080 and test:
1. Login with leah@lmllift.com / password
2. Navigate to Admin Portal
3. Try creating a user
4. Logout and login with new user

---

## Part 3: Make Blob Storage Private (15 minutes)

### Step 3.1: Update Blob Storage Access Level

```bash
# Make container private
az storage container set-permission \
  --name lml-data \
  --account-name lmldata \
  --public-access off

# Verify (should show "private")
az storage container show-properties \
  --name lml-data \
  --account-name lmldata \
  --query properties.publicAccess
```

### Step 3.2: Create SAS Token Generator Function

Create `api/src/functions/sas-token.ts` - see API README for code.

### Step 3.3: Update Frontend Data Fetching

Update `src/services/dataService.ts` to request SAS tokens before fetching CSVs.

---

## Part 4: Deploy to Production (30 minutes)

### Step 4.1: Commit Changes

```bash
git add -A
git commit -m "feat: implement server-side authentication with Azure Functions"
git push origin main
```

### Step 4.2: Update Static Web App Configuration

The GitHub Actions workflow will automatically deploy the frontend.

Monitor deployment at:
https://github.com/leahmartinez/lml-file-management/actions

### Step 4.3: Update CORS Settings

Once frontend is deployed, update Function App CORS:

```bash
FRONTEND_URL="https://your-app.azurestaticapps.net"

az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings "ALLOWED_ORIGINS=http://localhost:8080,$FRONTEND_URL"
```

### Step 4.4: Test Production

1. Navigate to: https://your-app.azurestaticapps.net
2. Login with: leah@lmllift.com / password
3. Test all features:
   - Dashboard loads
   - Admin portal works
   - Can create users
   - Can assign roles/sites
   - Logout works

---

## Done!

The app now has proper security:
- ✅ Real server-side authentication
- ✅ Encrypted passwords (bcrypt)
- ✅ Token-based sessions
- ✅ Secure admin portal
- ✅ Role-based permissions
- ✅ Private file storage

---

## 🔧 Post-Deployment Tasks

### Change Default Password

1. Login as leah@lmllift.com
2. Go to Admin Portal
3. Click "Edit" on admin user
4. Change password
5. Save

### Create Real Users

1. Login as admin
2. Go to Admin Portal
3. Click "Add User"
4. Enter real email addresses
5. Users will receive passwords via email (if email service configured)

### Monitor Costs

```bash
# Check cost analysis
az consumption usage list \
  --resource-group $RESOURCE_GROUP \
  --start-date $(date -d '7 days ago' +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d)
```

Expected costs:
- Azure Functions: ~$10/month (Consumption plan)
- Table Storage: ~$1/month
- Blob Storage: ~$1/month
- **Total: ~$12/month**

---

## 🐛 Troubleshooting

### API Returns 500 Error
```bash
# Check function app logs
az functionapp log tail \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP
```

### CORS Errors in Browser
```bash
# Update ALLOWED_ORIGINS
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings "ALLOWED_ORIGINS=your-frontend-url"
```

### Database Errors
```bash
# Reinitialize database
curl https://lml-api.azurewebsites.net/api/initialize
```

### JWT Token Errors
```bash
# Regenerate JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings "JWT_SECRET=$NEW_JWT_SECRET"

# All users will need to login again
```

---

## 📚 Next Steps

1. **Add Email Service** - Send invitation emails to new users
2. **Implement Password Reset** - Allow users to reset passwords
3. **Add Audit Logging** - Track all user actions
4. **Enable Monitoring** - Set up Application Insights
5. **Add MFA** - Multi-factor authentication for admins

See `docs/PRODUCTION_MIGRATION_PLAN.md` for full feature roadmap.

---

## 🆘 Need Help?

- **API Issues**: Check `api/README.md`
- **Deployment Issues**: Check Azure Portal logs
- **Frontend Issues**: Check browser console
- **Security Concerns**: Review `docs/SECURITY_AUDIT.md`

---

**Deployment Date**: _________  
**Deployed By**: _________  
**API URL**: https://lml-api.azurewebsites.net  
**Frontend URL**: https://your-app.azurestaticapps.net  
**JWT Secret**: _________ (store securely!)




