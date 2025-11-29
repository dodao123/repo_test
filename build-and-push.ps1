# Azure Container Registry Build and Push Script (PowerShell)
# Usage: .\build-and-push.ps1

# Azure Container Registry Configuration
$ACR_NAME = "mindxweek1acr"
$ACR_LOGIN_SERVER = "mindxweek1acr.azurecr.io"
$BACKEND_IMAGE = "backend"
$FRONTEND_IMAGE = "frontend"
$IMAGE_TAG = "latest"
$FRONTEND_URL = "https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net"

Write-Host "=== Azure Container Registry Build and Push Script ===" -ForegroundColor Cyan
Write-Host ""

# Login to ACR
Write-Host "[1/6] Logging in to Azure Container Registry..." -ForegroundColor Green
az acr login --name $ACR_NAME
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to login to ACR" -ForegroundColor Red
    exit 1
}

# Build and push Backend
Write-Host ""
Write-Host "[2/6] Building backend Docker image..." -ForegroundColor Green
docker build -t "$BACKEND_IMAGE`:$IMAGE_TAG" ./backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build backend image" -ForegroundColor Red
    exit 1
}

docker tag "$BACKEND_IMAGE`:$IMAGE_TAG" "$ACR_LOGIN_SERVER/$BACKEND_IMAGE`:$IMAGE_TAG"
Write-Host ""
Write-Host "[3/6] Pushing backend image to ACR..." -ForegroundColor Green
docker push "$ACR_LOGIN_SERVER/$BACKEND_IMAGE`:$IMAGE_TAG"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push backend image" -ForegroundColor Red
    exit 1
}

# Build and push Frontend
Write-Host ""
Write-Host "[4/6] Building frontend Docker image..." -ForegroundColor Green
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
Write-Host "[5/6] Pushing frontend image to ACR..." -ForegroundColor Green
docker push "$ACR_LOGIN_SERVER/$FRONTEND_IMAGE`:$IMAGE_TAG"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push frontend image" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[6/6] Build and push completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Images pushed:" -ForegroundColor Cyan
Write-Host "  - $ACR_LOGIN_SERVER/$BACKEND_IMAGE`:$IMAGE_TAG"
Write-Host "  - $ACR_LOGIN_SERVER/$FRONTEND_IMAGE`:$IMAGE_TAG"
Write-Host ""

