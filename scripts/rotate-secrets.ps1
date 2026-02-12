<#
.SYNOPSIS
    Rotates exposed secrets for the LML File Management application.

.DESCRIPTION
    This script rotates:
    1. JWT_SECRET - generates a new cryptographically secure random string
    2. Azure Storage Account key - rotates to key2, then regenerates key1
    3. Updates local.settings.json with new values
    4. Optionally updates Azure Function App settings

.PARAMETER StorageAccountName
    The Azure Storage Account name (default: liftwatchstorage1056)

.PARAMETER ResourceGroup
    The Azure Resource Group containing the storage account

.PARAMETER FunctionAppName
    The Azure Function App name (optional - for updating cloud settings)

.PARAMETER UpdateAzure
    If specified, also updates the Azure Function App settings

.EXAMPLE
    .\rotate-secrets.ps1 -ResourceGroup "lml-rg" -UpdateAzure
#>

param(
    [string]$StorageAccountName = "liftwatchstorage1056",
    [string]$ResourceGroup,
    [string]$FunctionAppName,
    [switch]$UpdateAzure
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SECRET ROTATION SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Azure CLI login
Write-Host "[1/5] Checking Azure CLI authentication..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure CLI. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}
Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($account.name)`n" -ForegroundColor Green

# Generate new JWT_SECRET (64 characters, alphanumeric)
Write-Host "[2/5] Generating new JWT_SECRET..." -ForegroundColor Yellow
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$newJwtSecret = [Convert]::ToBase64String($bytes) -replace '[^a-zA-Z0-9]', ''
$newJwtSecret = $newJwtSecret.Substring(0, [Math]::Min(64, $newJwtSecret.Length))
Write-Host "New JWT_SECRET generated (length: $($newJwtSecret.Length))" -ForegroundColor Green

# Find the resource group if not specified
if (-not $ResourceGroup) {
    Write-Host "`n[3/5] Finding resource group for storage account '$StorageAccountName'..." -ForegroundColor Yellow
    $storageAccounts = az storage account list --query "[?name=='$StorageAccountName']" | ConvertFrom-Json
    if ($storageAccounts.Count -eq 0) {
        Write-Host "ERROR: Storage account '$StorageAccountName' not found." -ForegroundColor Red
        Write-Host "Please specify -ResourceGroup parameter manually." -ForegroundColor Red
        exit 1
    }
    $ResourceGroup = $storageAccounts[0].resourceGroup
    Write-Host "Found resource group: $ResourceGroup" -ForegroundColor Green
} else {
    Write-Host "`n[3/5] Using specified resource group: $ResourceGroup" -ForegroundColor Yellow
}

# Rotate Azure Storage key
Write-Host "`n[4/5] Rotating Azure Storage Account key..." -ForegroundColor Yellow
Write-Host "  - Getting current key2 (will use this during rotation)..." -ForegroundColor Gray

# Get current key2 to use temporarily
$keys = az storage account keys list --account-name $StorageAccountName --resource-group $ResourceGroup | ConvertFrom-Json
$key2 = $keys[1].value
Write-Host "  - Current key2 retrieved" -ForegroundColor Gray

# Regenerate key1 (the exposed key)
Write-Host "  - Regenerating key1 (the exposed key)..." -ForegroundColor Gray
$newKeys = az storage account keys renew --account-name $StorageAccountName --resource-group $ResourceGroup --key key1 | ConvertFrom-Json
$newKey1 = $newKeys[0].value
Write-Host "  - Key1 regenerated successfully" -ForegroundColor Green

# Build new connection string
$newConnectionString = "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net;AccountName=$StorageAccountName;AccountKey=$newKey1;BlobEndpoint=https://$StorageAccountName.blob.core.windows.net/;FileEndpoint=https://$StorageAccountName.file.core.windows.net/;QueueEndpoint=https://$StorageAccountName.queue.core.windows.net/;TableEndpoint=https://$StorageAccountName.table.core.windows.net/"
$newWebJobsStorage = "DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net;AccountName=$StorageAccountName;AccountKey=$newKey1"

Write-Host "`n[5/5] Updating local.settings.json..." -ForegroundColor Yellow
$localSettingsPath = Join-Path $PSScriptRoot "..\api\local.settings.json"
if (Test-Path $localSettingsPath) {
    $localSettings = Get-Content $localSettingsPath -Raw | ConvertFrom-Json

    # Update values
    $localSettings.Values.JWT_SECRET = $newJwtSecret
    $localSettings.Values.AZURE_STORAGE_CONNECTION_STRING = $newConnectionString
    $localSettings.Values.AzureWebJobsStorage = $newWebJobsStorage

    # Save with proper formatting
    $localSettings | ConvertTo-Json -Depth 10 | Set-Content $localSettingsPath -Encoding UTF8
    Write-Host "local.settings.json updated successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING: local.settings.json not found at $localSettingsPath" -ForegroundColor Yellow
}

# Update Azure Function App settings if requested
if ($UpdateAzure -and $FunctionAppName) {
    Write-Host "`n[OPTIONAL] Updating Azure Function App settings..." -ForegroundColor Yellow

    az functionapp config appsettings set `
        --name $FunctionAppName `
        --resource-group $ResourceGroup `
        --settings "JWT_SECRET=$newJwtSecret" `
        "AZURE_STORAGE_CONNECTION_STRING=$newConnectionString" `
        "AzureWebJobsStorage=$newWebJobsStorage"

    Write-Host "Azure Function App settings updated" -ForegroundColor Green
} elseif ($UpdateAzure) {
    Write-Host "`nWARNING: -UpdateAzure specified but -FunctionAppName not provided" -ForegroundColor Yellow
    Write-Host "To update Azure Function App, run:" -ForegroundColor Yellow
    Write-Host "  az functionapp config appsettings set --name <function-app-name> --resource-group $ResourceGroup --settings `"JWT_SECRET=$newJwtSecret`"" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ROTATION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nSummary:" -ForegroundColor White
Write-Host "  - JWT_SECRET: Rotated" -ForegroundColor Green
Write-Host "  - Azure Storage Key: Rotated (key1 regenerated)" -ForegroundColor Green
Write-Host "  - local.settings.json: Updated" -ForegroundColor Green

Write-Host "`nIMPORTANT - Manual steps required:" -ForegroundColor Yellow
Write-Host "  1. Restart your local Azure Functions to pick up new settings" -ForegroundColor White
Write-Host "  2. All existing JWT tokens are now invalid - users must re-login" -ForegroundColor White
Write-Host "  3. If you have the Function App deployed, update its settings:" -ForegroundColor White
Write-Host "     az functionapp config appsettings set --name <app-name> --resource-group $ResourceGroup \" -ForegroundColor Gray
Write-Host "       --settings `"JWT_SECRET=$newJwtSecret`" \" -ForegroundColor Gray
Write-Host "       `"AZURE_STORAGE_CONNECTION_STRING=$newConnectionString`"" -ForegroundColor Gray

Write-Host "`nThird-party API keys (rotate manually in their portals):" -ForegroundColor Yellow
Write-Host "  - TinyMCE: https://www.tiny.cloud/my-account/dashboard/" -ForegroundColor White
Write-Host "  - Google Maps: https://console.cloud.google.com/apis/credentials" -ForegroundColor White
Write-Host "  - Azure AD: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps" -ForegroundColor White
Write-Host ""
