#!/bin/bash

# Complete Build and Deploy Script for AKS
# Usage: ./build-and-deploy.sh

# Configuration
ACR_NAME="mindxweek1acr"
ACR_LOGIN_SERVER="mindxweek1acr.azurecr.io"
BACKEND_IMAGE="backend"
FRONTEND_IMAGE="frontend"
IMAGE_TAG="latest"
RESOURCE_GROUP="mindx-dodd-rg"
AKS_CLUSTER="mindx-week1-aks"
NAMESPACE="default"
FRONTEND_URL="https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Build and Deploy to AKS - All-in-One${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ============================================
# PHASE 1: Build and Push Docker Images
# ============================================
echo -e "${YELLOW}[PHASE 1] Build and Push Docker Images${NC}"
echo ""

# Login to ACR
echo -e "${GREEN}[1/8] Logging in to Azure Container Registry...${NC}"
az acr login --name $ACR_NAME
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to login to ACR${NC}"
    exit 1
fi

# Build and push Backend
echo ""
echo -e "${GREEN}[2/8] Building backend Docker image...${NC}"
docker build -t $BACKEND_IMAGE:$IMAGE_TAG ./backend
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build backend image${NC}"
    exit 1
fi

docker tag $BACKEND_IMAGE:$IMAGE_TAG $ACR_LOGIN_SERVER/$BACKEND_IMAGE:$IMAGE_TAG
echo ""
echo -e "${GREEN}[3/8] Pushing backend image to ACR...${NC}"
docker push $ACR_LOGIN_SERVER/$BACKEND_IMAGE:$IMAGE_TAG
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push backend image${NC}"
    exit 1
fi

# Build and push Frontend
echo ""
echo -e "${GREEN}[4/8] Building frontend Docker image...${NC}"
docker build \
  --build-arg VITE_API_URL=$FRONTEND_URL \
  -t $FRONTEND_IMAGE:$IMAGE_TAG \
  ./frontend
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build frontend image${NC}"
    exit 1
fi

docker tag $FRONTEND_IMAGE:$IMAGE_TAG $ACR_LOGIN_SERVER/$FRONTEND_IMAGE:$IMAGE_TAG
echo ""
echo -e "${GREEN}[5/8] Pushing frontend image to ACR...${NC}"
docker push $ACR_LOGIN_SERVER/$FRONTEND_IMAGE:$IMAGE_TAG
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push frontend image${NC}"
    exit 1
fi

# ============================================
# PHASE 2: Deploy to AKS
# ============================================
echo ""
echo -e "${YELLOW}[PHASE 2] Deploy to AKS${NC}"
echo ""

# Connect to AKS
echo -e "${GREEN}[6/8] Connecting to AKS cluster...${NC}"
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to connect to AKS${NC}"
    exit 1
fi

# Create secrets and deploy
echo ""
echo -e "${GREEN}[7/8] Creating secrets and deploying...${NC}"

# ACR secret
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
kubectl create secret docker-registry acr-secret \
  --docker-server="${ACR_NAME}.azurecr.io" \
  --docker-username=$ACR_NAME \
  --docker-password=$ACR_PASSWORD \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Backend secret
kubectl create secret generic backend-env \
  --from-literal=PORT=3000 \
  --from-literal=NODE_ENV=production \
  --from-literal=FRONTEND_URL=$FRONTEND_URL \
  --from-literal=OIDC_ISSUER=https://id-dev.mindx.edu.vn \
  --from-literal=OIDC_CLIENT_ID=mindx-onboarding \
  --from-literal=OIDC_CLIENT_SECRET=cHJldmVudGJvdW5kYmF0dHJlZWV4cGxvcmVjZWxsbmVydm91c3ZhcG9ydGhhbnN0ZWU= \
  --from-literal=OIDC_REDIRECT_URI=$FRONTEND_URL/auth/callback \
  --from-literal=OIDC_SCOPE="openid profile email" \
  --from-literal=SESSION_SECRET=supersecret_123_abc_xyz \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Apply deployments
kubectl apply -f infra/k8s/backend-deployment-default.yaml
kubectl apply -f infra/k8s/backend-service.yaml
kubectl apply -f infra/k8s/frontend-deployment-default.yaml
kubectl apply -f infra/k8s/frontend-service.yaml

# Check status
echo ""
echo -e "${GREEN}[8/8] Checking deployment status...${NC}"
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

# Wait for rollout
echo ""
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"
kubectl rollout status deployment/week1-backend-deployment -n $NAMESPACE --timeout=5m
kubectl rollout status deployment/frontend-deployment -n $NAMESPACE --timeout=5m

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Build and Deploy Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Images deployed:${NC}"
echo -e "  - $ACR_LOGIN_SERVER/$BACKEND_IMAGE:$IMAGE_TAG"
echo -e "  - $ACR_LOGIN_SERVER/$FRONTEND_IMAGE:$IMAGE_TAG"
echo ""
echo -e "${CYAN}Application URL:${NC}"
echo -e "  - $FRONTEND_URL"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo -e "  kubectl logs -f deployment/week1-backend-deployment -n $NAMESPACE"
echo -e "  kubectl logs -f deployment/frontend-deployment -n $NAMESPACE"
echo ""
