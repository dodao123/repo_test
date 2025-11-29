# Complete Build and Deploy Script for AKS (PowerShell)
# Usage: .\build-and-deploy.ps1

# Configuration
$ACR_NAME = "mindxweek1acr"
$ACR_LOGIN_SERVER = "mindxweek1acr.azurecr.io"
$BACKEND_IMAGE = "backend"
$FRONTEND_IMAGE = "frontend"
$IMAGE_TAG = "latest"
$RESOURCE_GROUP = "mindx-dodd-rg"
$AKS_CLUSTER = "mindx-week1-aks"
$NAMESPACE = "default"
$FRONTEND_URL = "https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build and Deploy to AKS - All-in-One" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# PHASE 1: Build and Push Docker Images
# ============================================
Write-Host "[PHASE 1] Build and Push Docker Images" -ForegroundColor Yellow
Write-Host ""

# Login to ACR
Write-Host "[1/8] Logging in to Azure Container Registry..." -ForegroundColor Green
az acr login --name $ACR_NAME
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to login to ACR" -ForegroundColor Red
    exit 1
}

# Build and push Backend
Write-Host ""
Write-Host "[2/8] Building backend Docker image..." -ForegroundColor Green
docker build -t "$BACKEND_IMAGE`:$IMAGE_TAG" ./backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build backend image" -ForegroundColor Red
    exit 1
}

docker tag "$BACKEND_IMAGE`:$IMAGE_TAG" "$ACR_LOGIN_SERVER/$BACKEND_IMAGE`:$IMAGE_TAG"
Write-Host ""
Write-Host "[3/8] Pushing backend image to ACR..." -ForegroundColor Green
docker push "$ACR_LOGIN_SERVER/$BACKEND_IMAGE`:$IMAGE_TAG"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push backend image" -ForegroundColor Red
    exit 1
}

# Build and push Frontend
Write-Host ""
Write-Host "[4/8] Building frontend Docker image..." -ForegroundColor Green
docker build `
  --build-arg VITE_API_URL=$FRONTEND_URL `
  -t "$FRONTEND_IMAGE`:$IMAGE_TAG" `
  ./frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build frontend image" -ForegroundColor Red
    exit 1
}

docker tag "$FRONTEND_IMAGE`:$IMAGE_TAG" "$ACR_LOGIN_SERVER/$FRONTEND_IMAGE`:$IMAGE_TAG"
Write-Host ""
Write-Host "[5/8] Pushing frontend image to ACR..." -ForegroundColor Green
docker push "$ACR_LOGIN_SERVER/$FRONTEND_IMAGE`:$IMAGE_TAG"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push frontend image" -ForegroundColor Red
    exit 1
}

# ============================================
# PHASE 2: Deploy to AKS
# ============================================
Write-Host ""
Write-Host "[PHASE 2] Deploy to AKS" -ForegroundColor Yellow
Write-Host ""

# Connect to AKS
Write-Host "[6/8] Connecting to AKS cluster..." -ForegroundColor Green
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to connect to AKS" -ForegroundColor Red
    exit 1
}

# Create secrets and deploy
Write-Host ""
Write-Host "[7/8] Creating secrets and deploying..." -ForegroundColor Green

# ACR secret
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv
kubectl create secret docker-registry acr-secret `
  --docker-server="${ACR_NAME}.azurecr.io" `
  --docker-username=$ACR_NAME `
  --docker-password=$ACR_PASSWORD `
  --namespace=$NAMESPACE `
  --dry-run=client -o yaml | kubectl apply -f -

# Backend secret
kubectl create secret generic backend-env `
  --from-literal=PORT=3000 `
  --from-literal=NODE_ENV=production `
  --from-literal=FRONTEND_URL=$FRONTEND_URL `
  --from-literal=OIDC_ISSUER=https://id-dev.mindx.edu.vn `
  --from-literal=OIDC_CLIENT_ID=mindx-onboarding `
  --from-literal=OIDC_CLIENT_SECRET=cHJldmVudGJvdW5kYmF0dHJlZWV4cGxvcmVjZWxsbmVydm91c3ZhcG9ydGhhbnN0ZWU= `
  --from-literal=OIDC_REDIRECT_URI=$FRONTEND_URL/auth/callback `
  --from-literal=OIDC_SCOPE="openid profile email" `
  --from-literal=SESSION_SECRET=supersecret_123_abc_xyz `
  --namespace=$NAMESPACE `
  --dry-run=client -o yaml | kubectl apply -f -

# Apply deployments
kubectl apply -f infra/k8s/backend-deployment-default.yaml
kubectl apply -f infra/k8s/backend-service.yaml
kubectl apply -f infra/k8s/frontend-deployment-default.yaml
kubectl apply -f infra/k8s/frontend-service.yaml

# Check status
Write-Host ""
Write-Host "[8/8] Checking deployment status..." -ForegroundColor Green
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

# Wait for rollout
Write-Host ""
Write-Host "Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl rollout status deployment/week1-backend-deployment -n $NAMESPACE --timeout=5m
kubectl rollout status deployment/frontend-deployment -n $NAMESPACE --timeout=5m

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Build and Deploy Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images deployed:" -ForegroundColor Cyan
Write-Host "  - $ACR_LOGIN_SERVER/$BACKEND_IMAGE`:$IMAGE_TAG"
Write-Host "  - $ACR_LOGIN_SERVER/$FRONTEND_IMAGE`:$IMAGE_TAG"
Write-Host ""
Write-Host "Application URL:" -ForegroundColor Cyan
Write-Host "  - $FRONTEND_URL"
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  kubectl logs -f deployment/week1-backend-deployment -n $NAMESPACE"
Write-Host "  kubectl logs -f deployment/frontend-deployment -n $NAMESPACE"
Write-Host ""
