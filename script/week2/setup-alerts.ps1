# Setup Azure Application Insights Alerts
# This script configures alerts for production metrics monitoring

param(
    [string]$ResourceGroup = "mindx-dodd-rg",
    [string]$AppInsightsName = "",
    [string]$EmailAddress = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure App Insights Alert Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "   Download from: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
$azAccount = az account show 2>$null
if (-not $azAccount) {
    Write-Host "⚠️  Not logged in to Azure. Logging in..." -ForegroundColor Yellow
    az login
}

# Get App Insights resource
if ([string]::IsNullOrEmpty($AppInsightsName)) {
    Write-Host "📋 Listing Application Insights resources..." -ForegroundColor Green
    $appInsightsList = az monitor app-insights component show --resource-group $ResourceGroup --output json 2>$null
    if ($appInsightsList) {
        $appInsightsName = (ConvertFrom-Json $appInsightsList).name
        Write-Host "✅ Found App Insights: $appInsightsName" -ForegroundColor Green
    } else {
        Write-Host "❌ Could not find Application Insights resource." -ForegroundColor Red
        Write-Host "   Please provide App Insights name with -AppInsightsName parameter" -ForegroundColor Yellow
        exit 1
    }
}

# Get App Insights resource ID
$appInsightsId = az monitor app-insights component show --resource-group $ResourceGroup --app $AppInsightsName --query id -o tsv
if (-not $appInsightsId) {
    Write-Host "❌ Could not find Application Insights resource ID." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📊 App Insights Resource ID: $appInsightsId" -ForegroundColor Cyan
Write-Host ""

# Get email address for alerts
if ([string]::IsNullOrEmpty($EmailAddress)) {
    $EmailAddress = Read-Host "Enter email address for alert notifications"
}

# Create action group for email notifications
$actionGroupName = "app-insights-alerts-ag"
Write-Host "[1/5] Creating action group for email notifications..." -ForegroundColor Green

$existingAg = az monitor action-group show --resource-group $ResourceGroup --name $actionGroupName --output json 2>$null
if ($existingAg) {
    Write-Host "   ⚠️  Action group already exists, skipping creation" -ForegroundColor Yellow
    $actionGroupId = (ConvertFrom-Json $existingAg).id
} else {
    $actionGroupId = az monitor action-group create `
        --resource-group $ResourceGroup `
        --name $actionGroupName `
        --short-name "appalerts" `
        --email-receivers name="AdminEmail" email-address=$EmailAddress `
        --query id -o tsv
    
    if ($actionGroupId) {
        Write-Host "   ✅ Action group created: $actionGroupName" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to create action group" -ForegroundColor Red
        exit 1
    }
}

# Alert 1: High Error Rate
Write-Host ""
Write-Host "[2/5] Creating alert: High Error Rate (>5% failed requests)..." -ForegroundColor Green
$alertName1 = "HighErrorRate-Alert"
az monitor metrics alert create `
    --name $alertName1 `
    --resource-group $ResourceGroup `
    --scopes $appInsightsId `
    --condition "avg requests/failed > 5" `
    --window-size 5m `
    --evaluation-frequency 1m `
    --action $actionGroupId `
    --description "Alert when failed request percentage exceeds 5% over 5 minutes" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Alert created: $alertName1" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Alert may already exist or failed to create" -ForegroundColor Yellow
}

# Alert 2: High Response Time
Write-Host ""
Write-Host "[3/5] Creating alert: High Response Time (>1000ms average)..." -ForegroundColor Green
$alertName2 = "HighResponseTime-Alert"
az monitor metrics alert create `
    --name $alertName2 `
    --resource-group $ResourceGroup `
    --scopes $appInsightsId `
    --condition "avg requests/duration > 1000" `
    --window-size 5m `
    --evaluation-frequency 1m `
    --action $actionGroupId `
    --description "Alert when average response time exceeds 1000ms over 5 minutes" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Alert created: $alertName2" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Alert may already exist or failed to create" -ForegroundColor Yellow
}

# Alert 3: Server Exceptions
Write-Host ""
Write-Host "[4/5] Creating alert: Server Exceptions (>10 exceptions)..." -ForegroundColor Green
$alertName3 = "ServerExceptions-Alert"
az monitor metrics alert create `
    --name $alertName3 `
    --resource-group $ResourceGroup `
    --scopes $appInsightsId `
    --condition "count exceptions/exceptions > 10" `
    --window-size 5m `
    --evaluation-frequency 1m `
    --action $actionGroupId `
    --description "Alert when exception count exceeds 10 in 5 minutes" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Alert created: $alertName3" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Alert may already exist or failed to create" -ForegroundColor Yellow
}

# Alert 4: Availability
Write-Host ""
Write-Host "[5/5] Creating alert: Low Availability (<99%)..." -ForegroundColor Green
$alertName4 = "LowAvailability-Alert"
az monitor metrics alert create `
    --name $alertName4 `
    --resource-group $ResourceGroup `
    --scopes $appInsightsId `
    --condition "avg availabilityResults/availabilityPercentage < 99" `
    --window-size 15m `
    --evaluation-frequency 5m `
    --action $actionGroupId `
    --description "Alert when availability drops below 99% over 15 minutes" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Alert created: $alertName4" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Alert may already exist or failed to create" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Alert Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📧 Alerts will be sent to: $EmailAddress" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view alerts:" -ForegroundColor Yellow
Write-Host "  1. Go to Azure Portal → Application Insights → Alerts" -ForegroundColor White
Write-Host "  2. Or run: az monitor metrics alert list --resource-group $ResourceGroup" -ForegroundColor White
Write-Host ""
Write-Host "To test alerts, run: .\test-alerts.ps1" -ForegroundColor Yellow
Write-Host ""

