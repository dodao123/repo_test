#!/bin/bash

# Test Azure Application Insights Alerts
# This script triggers test scenarios to verify alerts are working

API_URL="${API_URL:-https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net}"
RESOURCE_GROUP="${RESOURCE_GROUP:-mindx-dodd-rg}"

echo "========================================"
echo "Testing Azure App Insights Alerts"
echo "========================================"
echo ""

echo "⚠️  WARNING: This script will generate test traffic that may trigger alerts."
echo "   Make sure you want to proceed before continuing."
echo ""
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Test cancelled."
    exit 0
fi

echo ""
echo "📋 Test Scenarios:"
echo "  1. High Error Rate Test (multiple 404 requests)"
echo "  2. High Response Time Test (multiple slow requests)"
echo "  3. Normal Traffic Test (baseline)"
echo ""

read -p "Select test scenario (1-3, or 'all' for all tests): " test_choice

test_high_error_rate() {
    echo ""
    echo "[Test 1] High Error Rate Test"
    echo "   Sending 50 requests to non-existent endpoints (404 errors)..."
    
    error_count=0
    for i in {1..50}; do
        curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/nonexistent-$i" > /dev/null 2>&1 || ((error_count++))
        if [ $((i % 10)) -eq 0 ]; then
            echo "   Sent $i requests..."
        fi
        sleep 0.1
    done
    
    echo "   ✅ Sent 50 requests. Check Azure Portal for HighErrorRate-Alert (may take 5-10 minutes)"
}

test_high_response_time() {
    echo ""
    echo "[Test 2] High Response Time Test"
    echo "   Sending multiple requests to simulate slow responses..."
    
    for i in {1..30}; do
        curl -s -o /dev/null "$API_URL/api/health" > /dev/null 2>&1
        if [ $((i % 10)) -eq 0 ]; then
            echo "   Sent $i requests..."
        fi
        sleep 0.2
    done
    
    echo "   ✅ Sent 30 requests. Check Azure Portal for HighResponseTime-Alert"
    echo "   ⚠️  Note: This may not trigger if backend is fast. Consider adding a /api/slow endpoint."
}

test_normal_traffic() {
    echo ""
    echo "[Test 3] Normal Traffic Test (Baseline)"
    echo "   Sending normal requests to verify metrics are being tracked..."
    
    for i in {1..10}; do
        status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")
        if [ "$status_code" = "200" ]; then
            echo "   ✅ Request $i: OK (200)"
        else
            echo "   ❌ Request $i: Failed ($status_code)"
        fi
        sleep 1
    done
    
    echo "   ✅ Baseline test complete. Check App Insights for normal metrics."
}

# Run selected test
case "$test_choice" in
    1)
        test_high_error_rate
        ;;
    2)
        test_high_response_time
        ;;
    3)
        test_normal_traffic
        ;;
    all)
        test_normal_traffic
        sleep 2
        test_high_error_rate
        sleep 2
        test_high_response_time
        ;;
    *)
        echo "❌ Invalid choice. Please select 1, 2, 3, or 'all'"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "✅ Test Complete!"
echo "========================================"
echo ""
echo "📊 Next Steps:"
echo "  1. Wait 5-10 minutes for alerts to process"
echo "  2. Check Azure Portal → Application Insights → Alerts"
echo "  3. Check your email for alert notifications"
echo "  4. View metrics in App Insights → Metrics or Logs"
echo ""
echo "To view alert history:"
echo "  az monitor metrics alert list --resource-group $RESOURCE_GROUP"
echo ""

