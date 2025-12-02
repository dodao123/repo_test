# Test Azure Application Insights Alerts
# This script triggers test scenarios to verify alerts are working

param(
    [string]$ApiUrl = "https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net",
    [string]$ResourceGroup = "mindx-dodd-rg"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Azure App Insights Alerts" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  WARNING: This script will generate test traffic that may trigger alerts." -ForegroundColor Yellow
Write-Host "   Make sure you want to proceed before continuing." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (y/N)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Test cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "📋 Test Scenarios:" -ForegroundColor Green
Write-Host "  1. High Error Rate Test (multiple 404 requests)" -ForegroundColor White
Write-Host "  2. High Response Time Test (multiple slow requests)" -ForegroundColor White
Write-Host "  3. Normal Traffic Test (baseline)" -ForegroundColor White
Write-Host ""

$testChoice = Read-Host "Select test scenario (1-3, or 'all' for all tests)"

function Test-HighErrorRate {
    Write-Host ""
    Write-Host "[Test 1] High Error Rate Test" -ForegroundColor Green
    Write-Host "   Sending 50 requests to non-existent endpoints (404 errors)..." -ForegroundColor Yellow
    
    $errorCount = 0
    for ($i = 1; $i -le 50; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "$ApiUrl/api/nonexistent-$i" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        } catch {
            $errorCount++
        }
        if ($i % 10 -eq 0) {
            Write-Host "   Sent $i requests..." -ForegroundColor Cyan
        }
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host "   ✅ Sent 50 requests. Check Azure Portal for HighErrorRate-Alert (may take 5-10 minutes)" -ForegroundColor Green
}

function Test-HighResponseTime {
    Write-Host ""
    Write-Host "[Test 2] High Response Time Test" -ForegroundColor Green
    Write-Host "   Sending multiple requests to simulate slow responses..." -ForegroundColor Yellow
    
    # Note: This test may not actually trigger if backend is fast
    # In real scenario, you might need to add a slow endpoint to backend
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "$ApiUrl/api/health" -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
        } catch {
            # Ignore errors
        }
        if ($i % 10 -eq 0) {
            Write-Host "   Sent $i requests..." -ForegroundColor Cyan
        }
        Start-Sleep -Milliseconds 200
    }
    
    Write-Host "   ✅ Sent 30 requests. Check Azure Portal for HighResponseTime-Alert" -ForegroundColor Green
    Write-Host "   ⚠️  Note: This may not trigger if backend is fast. Consider adding a /api/slow endpoint." -ForegroundColor Yellow
}

function Test-NormalTraffic {
    Write-Host ""
    Write-Host "[Test 3] Normal Traffic Test (Baseline)" -ForegroundColor Green
    Write-Host "   Sending normal requests to verify metrics are being tracked..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le 10; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "$ApiUrl/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "   ✅ Request $i: OK (200)" -ForegroundColor Green
            }
        } catch {
            Write-Host "   ❌ Request $i: Failed" -ForegroundColor Red
        }
        Start-Sleep -Seconds 1
    }
    
    Write-Host "   ✅ Baseline test complete. Check App Insights for normal metrics." -ForegroundColor Green
}

# Run selected test
switch ($testChoice) {
    "1" {
        Test-HighErrorRate
    }
    "2" {
        Test-HighResponseTime
    }
    "3" {
        Test-NormalTraffic
    }
    "all" {
        Test-NormalTraffic
        Start-Sleep -Seconds 2
        Test-HighErrorRate
        Start-Sleep -Seconds 2
        Test-HighResponseTime
    }
    default {
        Write-Host "❌ Invalid choice. Please select 1, 2, 3, or 'all'" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 5-10 minutes for alerts to process" -ForegroundColor White
Write-Host "  2. Check Azure Portal → Application Insights → Alerts" -ForegroundColor White
Write-Host "  3. Check your email for alert notifications" -ForegroundColor White
Write-Host "  4. View metrics in App Insights → Metrics or Logs" -ForegroundColor White
Write-Host ""
Write-Host "To view alert history:" -ForegroundColor Yellow
Write-Host "  az monitor metrics alert list --resource-group $ResourceGroup" -ForegroundColor White
Write-Host ""

