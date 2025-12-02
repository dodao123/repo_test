# Week 2: Metrics Setup Scripts

This directory contains scripts and documentation for setting up and managing production and product metrics.

## 📁 Files

- ****: Comprehensive guide for accessing and interpreting metrics
- **setup-alerts.ps1**: PowerShell script to configure Azure App Insights alerts (Windows)
- **setup-alerts.sh**: Bash script to configure Azure App Insights alerts (Linux/Mac)
- **test-alerts.ps1**: PowerShell script to test alert triggers (Windows)
- **test-alerts.sh**: Bash script to test alert triggers (Linux/Mac)

## 🚀 Quick Start

### Setup Alerts

**Windows:**
```powershell
cd script/week2
.\setup-alerts.ps1
```

**Linux/Mac:**
```bash
cd script/week2
chmod +x setup-alerts.sh
./setup-alerts.sh
```

The script will:
1. Prompt for Application Insights resource name (or auto-detect)
2. Prompt for email address for alert notifications
3. Create action group for email notifications
4. Create 4 alert rules:
   - High Error Rate (>5% failed requests)
   - High Response Time (>1000ms average)
   - Server Exceptions (>10 exceptions)
   - Low Availability (<99%)

### Test Alerts

**Windows:**
```powershell
cd script/week2
.\test-alerts.ps1
```

**Linux/Mac:**
```bash
cd script/week2
chmod +x test-alerts.sh
./test-alerts.sh
```

The script will:
1. Prompt for test scenario selection
2. Generate test traffic to trigger alerts
3. Provide instructions for verifying alerts

## 📚 Documentation

See [](./) for:
- How to access Azure App Insights
- How to access Google Analytics
- How to interpret metrics
- Troubleshooting guide
- Best practices

## ⚙️ Configuration

### Environment Variables (Optional)

You can set these environment variables instead of using prompts:

**Windows (PowerShell):**
```powershell
$env:RESOURCE_GROUP = "mindx-dodd-rg"
$env:APP_INSIGHTS_NAME = "your-app-insights-name"
$env:EMAIL_ADDRESS = "your-email@example.com"
$env:API_URL = "https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net"
```

**Linux/Mac (Bash):**
```bash
export RESOURCE_GROUP="mindx-dodd-rg"
export APP_INSIGHTS_NAME="your-app-insights-name"
export EMAIL_ADDRESS="your-email@example.com"
export API_URL="https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net"
```

### Script Parameters

**setup-alerts.ps1 / setup-alerts.sh:**
- `-ResourceGroup` / `RESOURCE_GROUP`: Azure resource group (default: `mindx-dodd-rg`)
- `-AppInsightsName` / `APP_INSIGHTS_NAME`: Application Insights resource name (optional, auto-detected)
- `-EmailAddress` / `EMAIL_ADDRESS`: Email for alert notifications (optional, will prompt)

**test-alerts.ps1 / test-alerts.sh:**
- `-ApiUrl` / `API_URL`: Backend API URL (default: production URL)
- `-ResourceGroup` / `RESOURCE_GROUP`: Azure resource group (default: `mindx-dodd-rg`)

## 🔍 Verification

After running setup scripts, verify alerts are created:

```bash
# List all alerts
az monitor metrics alert list --resource-group mindx-dodd-rg

# View alert details
az monitor metrics alert show --resource-group mindx-dodd-rg --name HighErrorRate-Alert
```

Or check in Azure Portal:
1. Go to Azure Portal → Application Insights
2. Click on "Alerts" in the left menu
3. View created alert rules

## 📧 Alert Notifications

Alerts will send email notifications to the configured email address when:
- Error rate exceeds 5% over 5 minutes
- Average response time exceeds 1000ms over 5 minutes
- Exception count exceeds 10 in 5 minutes
- Availability drops below 99% over 15 minutes

## 🛠️ Troubleshooting

### Script Fails to Find App Insights

**Solution:**
1. Manually provide App Insights name:
   ```powershell
   .\setup-alerts.ps1 -AppInsightsName "your-app-insights-name"
   ```

2. Or list available App Insights:
   ```bash
   az monitor app-insights component list --resource-group mindx-dodd-rg
   ```

### Alerts Not Triggering

**Possible Causes:**
1. Thresholds too high for current traffic
2. Data delay (alerts process every 1-5 minutes)
3. Alert rules not properly configured

**Solutions:**
1. Check alert configuration in Azure Portal
2. Run test scripts to generate test traffic
3. Wait 10-15 minutes after test traffic
4. Check alert history in Azure Portal

### Email Notifications Not Received

**Solutions:**
1. Check spam folder
2. Verify email address in action group
3. Check action group configuration:
   ```bash
   az monitor action-group show --resource-group mindx-dodd-rg --name app-insights-alerts-ag
   ```

## 📝 Notes

- Alerts may take 5-10 minutes to process after threshold is exceeded
- Test scripts generate real traffic that may trigger alerts
- Alert thresholds can be adjusted in Azure Portal if needed
- All scripts require Azure CLI to be installed and logged in

## 🔗 Related Documentation

- [Main ](../../)
- [AC_EVALUATION.md](../../AC_EVALUATION.md)
- [](./)

