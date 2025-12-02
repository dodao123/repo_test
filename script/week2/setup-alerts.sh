#!/bin/bash

# Setup Azure Application Insights Alerts
# This script configures alerts for production metrics monitoring

RESOURCE_GROUP="${RESOURCE_GROUP:-mindx-dodd-rg}"
APP_INSIGHTS_NAME="${APP_INSIGHTS_NAME:-}"
EMAIL_ADDRESS="${EMAIL_ADDRESS:-}"

echo "========================================"
echo "Azure App Insights Alert Setup"
echo "========================================"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    echo "   Visit: https://aka.ms/installazurecli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "⚠️  Not logged in to Azure. Logging in..."
    az login
fi

# Get App Insights resource
if [ -z "$APP_INSIGHTS_NAME" ]; then
    echo "📋 Listing Application Insights resources..."
    APP_INSIGHTS_NAME=$(az monitor app-insights component show --resource-group "$RESOURCE_GROUP" --query name -o tsv 2>/dev/null)
    if [ -z "$APP_INSIGHTS_NAME" ]; then
        echo "❌ Could not find Application Insights resource."
        echo "   Please set APP_INSIGHTS_NAME environment variable"
        exit 1
    fi
    echo "✅ Found App Insights: $APP_INSIGHTS_NAME"
fi

# Get App Insights resource ID
APP_INSIGHTS_ID=$(az monitor app-insights component show --resource-group "$RESOURCE_GROUP" --app "$APP_INSIGHTS_NAME" --query id -o tsv)
if [ -z "$APP_INSIGHTS_ID" ]; then
    echo "❌ Could not find Application Insights resource ID."
    exit 1
fi

echo ""
echo "📊 App Insights Resource ID: $APP_INSIGHTS_ID"
echo ""

# Get email address for alerts
if [ -z "$EMAIL_ADDRESS" ]; then
    read -p "Enter email address for alert notifications: " EMAIL_ADDRESS
fi

# Create action group for email notifications
ACTION_GROUP_NAME="app-insights-alerts-ag"
echo "[1/5] Creating action group for email notifications..."

if az monitor action-group show --resource-group "$RESOURCE_GROUP" --name "$ACTION_GROUP_NAME" &> /dev/null; then
    echo "   ⚠️  Action group already exists, skipping creation"
    ACTION_GROUP_ID=$(az monitor action-group show --resource-group "$RESOURCE_GROUP" --name "$ACTION_GROUP_NAME" --query id -o tsv)
else
    ACTION_GROUP_ID=$(az monitor action-group create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$ACTION_GROUP_NAME" \
        --short-name "appalerts" \
        --email-receivers name="AdminEmail" email-address="$EMAIL_ADDRESS" \
        --query id -o tsv)
    
    if [ -n "$ACTION_GROUP_ID" ]; then
        echo "   ✅ Action group created: $ACTION_GROUP_NAME"
    else
        echo "   ❌ Failed to create action group"
        exit 1
    fi
fi

# Alert 1: High Error Rate
echo ""
echo "[2/5] Creating alert: High Error Rate (>5% failed requests)..."
ALERT_NAME1="HighErrorRate-Alert"
az monitor metrics alert create \
    --name "$ALERT_NAME1" \
    --resource-group "$RESOURCE_GROUP" \
    --scopes "$APP_INSIGHTS_ID" \
    --condition "avg requests/failed > 5" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action "$ACTION_GROUP_ID" \
    --description "Alert when failed request percentage exceeds 5% over 5 minutes" \
    --output none

if [ $? -eq 0 ]; then
    echo "   ✅ Alert created: $ALERT_NAME1"
else
    echo "   ⚠️  Alert may already exist or failed to create"
fi

# Alert 2: High Response Time
echo ""
echo "[3/5] Creating alert: High Response Time (>1000ms average)..."
ALERT_NAME2="HighResponseTime-Alert"
az monitor metrics alert create \
    --name "$ALERT_NAME2" \
    --resource-group "$RESOURCE_GROUP" \
    --scopes "$APP_INSIGHTS_ID" \
    --condition "avg requests/duration > 1000" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action "$ACTION_GROUP_ID" \
    --description "Alert when average response time exceeds 1000ms over 5 minutes" \
    --output none

if [ $? -eq 0 ]; then
    echo "   ✅ Alert created: $ALERT_NAME2"
else
    echo "   ⚠️  Alert may already exist or failed to create"
fi

# Alert 3: Server Exceptions
echo ""
echo "[4/5] Creating alert: Server Exceptions (>10 exceptions)..."
ALERT_NAME3="ServerExceptions-Alert"
az monitor metrics alert create \
    --name "$ALERT_NAME3" \
    --resource-group "$RESOURCE_GROUP" \
    --scopes "$APP_INSIGHTS_ID" \
    --condition "count exceptions/exceptions > 10" \
    --window-size 5m \
    --evaluation-frequency 1m \
    --action "$ACTION_GROUP_ID" \
    --description "Alert when exception count exceeds 10 in 5 minutes" \
    --output none

if [ $? -eq 0 ]; then
    echo "   ✅ Alert created: $ALERT_NAME3"
else
    echo "   ⚠️  Alert may already exist or failed to create"
fi

# Alert 4: Availability
echo ""
echo "[5/5] Creating alert: Low Availability (<99%)..."
ALERT_NAME4="LowAvailability-Alert"
az monitor metrics alert create \
    --name "$ALERT_NAME4" \
    --resource-group "$RESOURCE_GROUP" \
    --scopes "$APP_INSIGHTS_ID" \
    --condition "avg availabilityResults/availabilityPercentage < 99" \
    --window-size 15m \
    --evaluation-frequency 5m \
    --action "$ACTION_GROUP_ID" \
    --description "Alert when availability drops below 99% over 15 minutes" \
    --output none

if [ $? -eq 0 ]; then
    echo "   ✅ Alert created: $ALERT_NAME4"
else
    echo "   ⚠️  Alert may already exist or failed to create"
fi

echo ""
echo "========================================"
echo "✅ Alert Setup Complete!"
echo "========================================"
echo ""
echo "📧 Alerts will be sent to: $EMAIL_ADDRESS"
echo ""
echo "To view alerts:"
echo "  1. Go to Azure Portal → Application Insights → Alerts"
echo "  2. Or run: az monitor metrics alert list --resource-group $RESOURCE_GROUP"
echo ""
echo "To test alerts, run: ./test-alerts.sh"
echo ""

