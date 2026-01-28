# Azure Static Web Apps Deployment Guide

This guide explains how to deploy the LML Work Management application to Azure Static Web Apps.

## Prerequisites

1. Azure account with active subscription
2. GitHub account (for CI/CD)
3. Node.js 18+ installed locally
4. Azure CLI installed (optional, for manual deployment)

## Deployment Steps

### 1. Create Azure Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Static Web App"
4. Click "Create"
5. Fill in the details:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `lml-file-management` (or your preferred name)
   - **Plan type**: Free or Standard
   - **Region**: Choose closest region
   - **Source**: GitHub
   - **GitHub account**: Sign in and authorize
   - **Organization**: Your GitHub organization/username
   - **Repository**: `lml-file-management` (or your repo name)
   - **Branch**: `main` or `dev`
   - **Build Presets**: Custom
   - **App location**: `/`
   - **Api location**: (leave empty)
   - **Output location**: `build`

6. Click "Review + create", then "Create"

### 2. Configure GitHub Actions

After creating the Static Web App, Azure will:
- Create a GitHub Actions workflow file (`.github/workflows/azure-static-web-apps.yml`)
- Add the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret to your repository

The workflow is already configured in this repository.

### 3. Build Configuration

The application uses Vite for building. The build process:
1. Runs tests (`npm run test:run`)
2. Builds the application (`npm run build`)
3. Outputs to `build/` directory

### 4. Static Web App Configuration

The `staticwebapp.config.json` file configures:
- **Navigation fallback**: Routes all requests to `index.html` for SPA routing
- **Routes**: Defines route rewrites and role-based access
- **Response overrides**: Handles 404 errors
- **MIME types**: Configures CSV and JSON file types
- **Global headers**: Security headers (CSP, XSS protection, etc.)

### 5. Configure Node.js Version and Environment Variables

**IMPORTANT:** This project requires Node.js 20+. Azure Static Web Apps may default to Node 18, which will cause build warnings and runtime errors.

#### Set Node.js Version

The Node.js version is configured in `staticwebapp.config.json`:

```json
{
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

This file is already configured in your project. The `.nvmrc` file in the `api/` directory also helps ensure Node 20 is used during deployment.

#### Configure API Environment Variables

The API functions require the following environment variables:

1. Go to Azure Portal → Your Static Web App → Configuration
2. Click on **Application settings**
3. Add the following application settings:

   **Required Settings:**
   - `AZURE_STORAGE_CONNECTION_STRING`: Connection string to your Azure Storage Account
     - Get this from: Azure Portal → Your Storage Account → Access keys → Connection string
   - `JWT_SECRET`: A secure random string for JWT token signing
     - Generate using: `openssl rand -base64 32` or PowerShell: `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
     - Example: `https://your-app.azurestaticapps.net,http://localhost:8080`

4. Click **Save** (this will restart your app)

**Note:** After setting these, you may need to trigger a redeploy or wait a few minutes for the changes to take effect.

### 6. Custom Domain (Optional)

1. Go to Azure Portal → Your Static Web App → Custom domains
2. Click "Add"
3. Follow the instructions to add your domain
4. Update DNS records as instructed

## Security Considerations

### Content Security Policy

The CSP in `staticwebapp.config.json` allows:
- Self-hosted resources
- Office Online viewer for file previews
- Inline styles (required for some UI components)

### Authentication

Currently using client-side authentication with localStorage. For production:
- Consider implementing Azure AD authentication
- Use Azure Static Web Apps built-in authentication
- Implement server-side session management

### Data Storage

- Static data files (CSV, JSON) are served from `/public`
- User data stored in localStorage (client-side only)
- For production, consider Azure Blob Storage or Cosmos DB

## Monitoring

### Application Insights

1. Go to Azure Portal → Your Static Web App
2. Enable Application Insights
3. View metrics, logs, and performance data

### Logs

View deployment and runtime logs:
1. Azure Portal → Your Static Web App → Deployment history
2. GitHub Actions → Workflow runs

## Troubleshooting

### Build Failures

1. Check GitHub Actions logs
2. Verify Node.js version (should be 20+)
3. Check for dependency issues: `npm install`
4. Verify build script: `npm run build`

### Node.js Version Issues

If you see `EBADENGINE Unsupported engine` warnings:

1. **Verify Node version is set correctly:**
   - Check `staticwebapp.config.json` has `"platform": { "apiRuntime": "node:20" }`
   - Verify `.nvmrc` file exists in `api/` directory with content `20`

2. **After updating Node version:**
   - Save configuration in Azure Portal
   - Wait 2-3 minutes for the change to propagate
   - Trigger a new deployment or restart the app

### API 500 Internal Server Error

If you're getting 500 errors from API endpoints (e.g., `/api/profile`):

1. **Check environment variables are set:**
   - Go to Azure Portal → Your Static Web App → Configuration
   - Verify these settings exist:
     - `AZURE_STORAGE_CONNECTION_STRING`
     - `JWT_SECRET`
     - `ALLOWED_ORIGINS`

2. **Check Node.js version:**
   - Ensure `staticwebapp.config.json` has `"platform": { "apiRuntime": "node:20" }`
   - The API requires Node 20+ due to Azure SDK dependencies

3. **Check function logs:**
   - Go to Azure Portal → Your Static Web App → Functions
   - Click on the failing function (e.g., `profile`)
   - Check "Logs" or "Monitor" tab for error details

4. **Initialize the database:**
   - If this is a fresh deployment, call the initialize endpoint:
     - `GET https://your-app.azurestaticapps.net/api/initialize`
   - This creates the database tables and seeds an admin user

5. **Verify storage account connection:**
   - Ensure the storage account exists and is accessible
   - Verify the connection string is correct
   - Check that the storage account is in the same region or accessible

### Routing Issues

1. Verify `staticwebapp.config.json` navigation fallback
2. Check that all routes rewrite to `index.html`
3. Verify route definitions match your app routes

### 404 Errors

1. Check `staticwebapp.config.json` response overrides
2. Verify file paths in `build/` directory
3. Check MIME type configuration

### CORS Issues

1. Verify CSP headers in `staticwebapp.config.json`
2. Check that external resources are allowed
3. For Office Online viewer, ensure `connect-src` includes the domain

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Build the application
npm run build

# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy (requires Azure login)
swa deploy ./build --deployment-token YOUR_TOKEN
```

Get deployment token from:
Azure Portal → Your Static Web App → Manage deployment token

## CI/CD Pipeline

The GitHub Actions workflow:
1. Triggers on push to `main` or `dev` branches
2. Runs tests
3. Builds the application
4. Deploys to Azure Static Web Apps
5. Closes preview environments on PR close

## Testing in Production

Before going live:
1. ✅ Run all tests: `npm run test:run`
2. ✅ Test authentication flows
3. ✅ Test role-based access
4. ✅ Test file uploads/previews
5. ✅ Test data filtering
6. ✅ Verify security headers
7. ✅ Test on different browsers
8. ✅ Test responsive design

## Rollback

To rollback to a previous deployment:
1. Go to Azure Portal → Your Static Web App → Deployment history
2. Select the deployment to restore
3. Click "Redeploy"

## Cost Estimation

**Free Tier:**
- 100 GB bandwidth/month
- 100 custom domains
- Unlimited builds
- Suitable for demo/testing

**Standard Tier:**
- Custom pricing
- More bandwidth
- Staging environments
- Custom authentication
- Better for production

## Next Steps

1. Set up monitoring and alerts
2. Configure custom domain
3. Implement Azure AD authentication (optional)
4. Set up backup strategy for data
5. Configure CDN for better performance
6. Set up staging environment

## Support

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Static Web Apps GitHub](https://github.com/Azure/static-web-apps)
- [Vite Documentation](https://vitejs.dev/)



