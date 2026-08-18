# Azure Functions Deployment Script
# Run this after completing 'az login'

# Set your variables (customize these)
$RESOURCE_GROUP = "lml-rg"
$LOCATION = "australiaeast"  # Or your preferred region
$STORAGE_ACCOUNT = "lmlstorage$(Get-Random -Maximum 9999)"  # Must be globally unique
$FUNCTION_APP = "lml-file-management-api-$(Get-Random -Maximum 9999)"  # Must be globally unique

Write-Host "Creating Azure resources..." -ForegroundColor Cyan
Write-Host "Resource Group: $RESOURCE_GROUP" -ForegroundColor Yellow
Write-Host "Storage Account: $STORAGE_ACCOUNT" -ForegroundColor Yellow
Write-Host "Function App: $FUNCTION_APP" -ForegroundColor Yellow
Write-Host ""

# Create resource group (if it doesn't exist)
Write-Host "Creating resource group..." -ForegroundColor Cyan
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
Write-Host "Creating storage account..." -ForegroundColor Cyan
az storage account create `
  --name $STORAGE_ACCOUNT `
  --location $LOCATION `
  --resource-group $RESOURCE_GROUP `
  --sku Standard_LRS

# Create Function App with Node 20
Write-Host "Creating Function App with Node 20..." -ForegroundColor Cyan
az functionapp create `
  --resource-group $RESOURCE_GROUP `
  --consumption-plan-location $LOCATION `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --name $FUNCTION_APP `
  --storage-account $STORAGE_ACCOUNT `
  --os-type Linux

Write-Host ""
Write-Host "✅ Function App created!" -ForegroundColor Green
Write-Host "Function App name: $FUNCTION_APP" -ForegroundColor Green
Write-Host "Function App URL: https://$FUNCTION_APP.azurewebsites.net" -ForegroundColor Green
Write-Host ""

# Get storage connection string
Write-Host "Getting storage connection string..." -ForegroundColor Cyan
$STORAGE_CONNECTION = az storage account show-connection-string `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query connectionString `
  --output tsv

# Generate JWT secret
Write-Host "Generating JWT secret..." -ForegroundColor Cyan
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Host "JWT_SECRET generated (saved below)" -ForegroundColor Yellow
Write-Host ""

# Set application settings
Write-Host "Configuring Function App settings..." -ForegroundColor Cyan
az functionapp config appsettings set `
  --name $FUNCTION_APP `
  --resource-group $RESOURCE_GROUP `
  --settings `
    "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION" `
    "JWT_SECRET=$JWT_SECRET" `
    "ALLOWED_ORIGINS=https://your-app.azurestaticapps.net"

Write-Host ""
Write-Host "✅ Environment variables configured!" -ForegroundColor Green
Write-Host ""
Write-Host "=== IMPORTANT: Save these values ===" -ForegroundColor Yellow
Write-Host "Function App Name: $FUNCTION_APP" -ForegroundColor Yellow
Write-Host "Function App URL: https://$FUNCTION_APP.azurewebsites.net/api" -ForegroundColor Yellow
Write-Host "JWT_SECRET: $JWT_SECRET" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host ""

# Deploy the API
Write-Host "Building API..." -ForegroundColor Cyan
Set-Location api
npm run build

Write-Host ""
Write-Host "Deploying API to Azure Functions..." -ForegroundColor Cyan
func azure functionapp publish $FUNCTION_APP

Write-Host ""
Write-Host "✅ API deployed!" -ForegroundColor Green
Write-Host ""

# Initialize database
Write-Host "Initializing database..." -ForegroundColor Cyan
$API_URL = "https://$FUNCTION_APP.azurewebsites.net"
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/initialize" -Method GET
    Write-Host "✅ Database initialized!" -ForegroundColor Green
    Write-Host $response | ConvertTo-Json
} catch {
    Write-Host "❌ Database initialization failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Go to Azure Portal → Your Static Web App → Configuration" -ForegroundColor Yellow
Write-Host "2. Add application setting:" -ForegroundColor Yellow
Write-Host "   Name: VITE_API_BASE_URL" -ForegroundColor Yellow
Write-Host "   Value: https://$FUNCTION_APP.azurewebsites.net/api" -ForegroundColor Yellow
Write-Host "3. Save and wait for deployment" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Cyan



