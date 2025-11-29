#!/bin/bash

# Quick Deploy Script for AKS
# Usage: ./deploy.sh

RESOURCE_GROUP="mindx-dodd-rg"
AKS_CLUSTER="mindx-week1-aks"
ACR_NAME="mindxweek1acr"
NAMESPACE="default"

echo "=== Deploying to AKS ==="
echo ""

# Connect to AKS
echo "[1/7] Connecting to AKS cluster..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing
if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to AKS"
    exit 1
fi

# Create ACR secret
echo ""
echo "[2/7] Creating ACR secret..."
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
kubectl create secret docker-registry acr-secret \
  --docker-server="${ACR_NAME}.azurecr.io" \
  --docker-username=$ACR_NAME \
  --docker-password=$ACR_PASSWORD \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Create backend secret
echo ""
echo "[3/7] Creating backend secret..."
kubectl create secret generic backend-env \
  --from-literal=PORT=3000 \
  --from-literal=NODE_ENV=production \
  --from-literal=FRONTEND_URL=https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net \
  --from-literal=OIDC_ISSUER=https://id-dev.mindx.edu.vn \
  --from-literal=OIDC_CLIENT_ID=mindx-onboarding \
  --from-literal=OIDC_CLIENT_SECRET=cHJldmVudGJvdW5kYmF0dHJlZWV4cGxvcmVjZWxsbmVydm91c3ZhcG9ydGhhbnN0ZWU= \
  --from-literal=OIDC_REDIRECT_URI=https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/auth/callback \
  --from-literal=OIDC_SCOPE="openid profile email" \
  --from-literal=SESSION_SECRET=supersecret_123_abc_xyz \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy backend
echo ""
echo "[4/7] Deploying backend..."
kubectl apply -f infra/k8s/backend-deployment-default.yaml
kubectl apply -f infra/k8s/backend-service.yaml

# Deploy frontend
echo ""
echo "[5/7] Deploying frontend..."
kubectl apply -f infra/k8s/frontend-deployment-default.yaml
kubectl apply -f infra/k8s/frontend-service.yaml

# Note: Azure Front Door is used for routing, not Kubernetes Ingress
echo ""
echo "[Note] Azure Front Door is configured separately and handles routing"
echo "       Endpoint: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net"

# Check status
echo ""
echo "[6/7] Checking deployment status..."
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

# Wait for rollout
echo ""
echo "[7/7] Waiting for deployments to be ready..."
kubectl rollout status deployment/week1-backend-deployment -n $NAMESPACE --timeout=5m
kubectl rollout status deployment/frontend-deployment -n $NAMESPACE --timeout=5m

echo ""
echo "=== Deployment completed! ==="
echo ""
