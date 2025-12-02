# Quick Deploy Script for AKS (PowerShell)
# Usage: .\deploy.ps1

$RESOURCE_GROUP = "mindx-dodd-rg"
$AKS_CLUSTER = "mindx-week1-aks"
$ACR_NAME = "mindxweek1acr"
$NAMESPACE = "default"

Write-Host "=== Deploying to AKS ===" -ForegroundColor Cyan
Write-Host ""

# Connect to AKS
Write-Host "[1/7] Connecting to AKS cluster..." -ForegroundColor Green
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to connect to AKS" -ForegroundColor Red
    exit 1
}

# Create ACR secret
Write-Host ""
Write-Host "[2/7] Creating ACR secret..." -ForegroundColor Green
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv
kubectl create secret docker-registry acr-secret `
  --docker-server="${ACR_NAME}.azurecr.io" `
  --docker-username=$ACR_NAME `
  --docker-password=$ACR_PASSWORD `
  --namespace=$NAMESPACE `
  --dry-run=client -o yaml | kubectl apply -f -

# Create backend secret
Write-Host ""
Write-Host "[3/7] Creating backend secret..." -ForegroundColor Green
kubectl create secret generic backend-env `
  --from-literal=PORT=3000 `
  --from-literal=NODE_ENV=production `
  --from-literal=FRONTEND_URL=https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net `
  --from-literal=OIDC_ISSUER=https://id-dev.mindx.edu.vn `
  --from-literal=OIDC_CLIENT_ID=mindx-onboarding `
  --from-literal=OIDC_CLIENT_SECRET=cHJldmVudGJvdW5kYmF0dHJlZWV4cGxvcmVjZWxsbmVydm91c3ZhcG9ydGhhbnN0ZWU= `
  --from-literal=OIDC_REDIRECT_URI=https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/auth/callback `
  --from-literal=OIDC_SCOPE="openid profile email" `
  --from-literal=SESSION_SECRET=supersecret_123_abc_xyz `
  --from-literal=APPINSIGHTS_CONNECTION_STRING="InstrumentationKey=a85d2b13-8cbd-443f-ace5-011141e809b5;IngestionEndpoint=https://southeastasia-1.in.applicationinsights.azure.com/;LiveEndpoint=https://southeastasia.livediagnostics.monitor.azure.com/;ApplicationId=45ee7616-f5a8-4f37-b75d-9edd37761a63" `
  --namespace=$NAMESPACE `
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy backend
Write-Host ""
Write-Host "[4/7] Deploying backend..." -ForegroundColor Green
kubectl apply -f infra/k8s/backend-deployment-default.yaml
kubectl apply -f infra/k8s/backend-service.yaml

# Deploy frontend
Write-Host ""
Write-Host "[5/7] Deploying frontend..." -ForegroundColor Green
kubectl apply -f infra/k8s/frontend-deployment-default.yaml
kubectl apply -f infra/k8s/frontend-service.yaml

# Note: Azure Front Door is used for routing, not Kubernetes Ingress
Write-Host ""
Write-Host "[Note] Azure Front Door is configured separately and handles routing" -ForegroundColor Yellow
Write-Host "       Endpoint: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net" -ForegroundColor Yellow

# Check status
Write-Host ""
Write-Host "[6/7] Checking deployment status..." -ForegroundColor Green
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

# Wait for rollout
Write-Host ""
Write-Host "[7/7] Waiting for deployments to be ready..." -ForegroundColor Green
kubectl rollout status deployment/week1-backend-deployment -n $NAMESPACE --timeout=5m
kubectl rollout status deployment/frontend-deployment -n $NAMESPACE --timeout=5m

Write-Host ""
Write-Host "=== Deployment completed! ===" -ForegroundColor Green
Write-Host ""
