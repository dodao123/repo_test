#!/bin/bash

# Azure Container Registry Build and Push Script
# Usage: ./build-and-push.sh

# Azure Container Registry Configuration
ACR_NAME="mindxweek1acr"
ACR_LOGIN_SERVER="mindxweek1acr.azurecr.io"
BACKEND_IMAGE="backend"
FRONTEND_IMAGE="frontend"
IMAGE_TAG="latest"
FRONTEND_URL="https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net"

echo "=== Azure Container Registry Build and Push Script ==="
echo ""

# Login to ACR
echo "[1/6] Logging in to Azure Container Registry..."
az acr login --name $ACR_NAME
if [ $? -ne 0 ]; then
    echo "❌ Failed to login to ACR"
    exit 1
fi

# Build and push Backend
echo ""
echo "[2/6] Building backend Docker image..."
docker build -t $BACKEND_IMAGE:$IMAGE_TAG ./backend
if [ $? -ne 0 ]; then
    echo "❌ Failed to build backend image"
    exit 1
fi

docker tag $BACKEND_IMAGE:$IMAGE_TAG $ACR_LOGIN_SERVER/$BACKEND_IMAGE:$IMAGE_TAG
echo ""
echo "[3/6] Pushing backend image to ACR..."
docker push $ACR_LOGIN_SERVER/$BACKEND_IMAGE:$IMAGE_TAG
if [ $? -ne 0 ]; then
    echo "❌ Failed to push backend image"
    exit 1
fi

# Build and push Frontend
echo ""
echo "[4/6] Building frontend Docker image..."
docker build \
  --build-arg VITE_API_URL=$FRONTEND_URL \
  -t $FRONTEND_IMAGE:$IMAGE_TAG \
  ./frontend
if [ $? -ne 0 ]; then
    echo "❌ Failed to build frontend image"
    exit 1
fi

docker tag $FRONTEND_IMAGE:$IMAGE_TAG $ACR_LOGIN_SERVER/$FRONTEND_IMAGE:$IMAGE_TAG
echo ""
echo "[5/6] Pushing frontend image to ACR..."
docker push $ACR_LOGIN_SERVER/$FRONTEND_IMAGE:$IMAGE_TAG
if [ $? -ne 0 ]; then
    echo "❌ Failed to push frontend image"
    exit 1
fi

echo ""
echo "[6/6] Build and push completed!"
echo ""
echo "Images pushed:"
echo "  - $ACR_LOGIN_SERVER/$BACKEND_IMAGE:$IMAGE_TAG"
echo "  - $ACR_LOGIN_SERVER/$FRONTEND_IMAGE:$IMAGE_TAG"
echo ""

