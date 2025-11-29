# Deployment Guide - Week 1 Project

## 📋 Tổng quan

Dự án này là một Fullstack Application (React + Node.js/Express) được deploy lên Azure Cloud với:
- **Backend API**: Node.js/Express với TypeScript
- **Frontend**: React với TypeScript
- **Infrastructure**: Azure Kubernetes Service (AKS)
- **Container Registry**: Azure Container Registry (ACR)
- **Load Balancer**: Azure Front Door
- **Authentication**: OpenID Connect với MindX Identity Provider

## 🌐 Production URLs

- **Application**: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net
- **Backend API**: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/api/*
- **Health Check**: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/api/health

## 🏗️ Architecture

```
User → Azure Front Door (HTTPS) → AKS Services
                                    ├── Backend Service (4.144.193.135:80)
                                    └── Frontend Service (135.171.162.240:80)
```

**Routing Rules:**
- `/api/*` → Backend Service
- `/auth/*` → Backend Service
- `/*` → Frontend Service (catch-all)

## 📦 Prerequisites

1. **Azure CLI** installed and logged in
   ```bash
   az login
   ```

2. **kubectl** installed
   ```bash
   az aks install-cli
   ```

3. **Docker** installed and running

4. **Access to Azure Resources:**
   - Resource Group: `mindx-dodd-rg`
   - AKS Cluster: `mindx-week1-aks`
   - ACR: `mindxweek1acr`

## 🚀 Quick Start

### Option 1: All-in-One Script (Khuyến nghị)

**Windows:**
```powershell
.\build-and-deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

### Option 2: Step by Step

#### Step 1: Build and Push Images

**Windows:**
```powershell
.\build-and-push.ps1
```

**Linux/Mac:**
```bash
chmod +x build-and-push.sh
./build-and-push.sh
```

#### Step 2: Deploy to AKS

**Windows:**
```powershell
.\deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📝 Manual Deployment Steps

### 1. Build Docker Images

```bash
# Backend
cd backend
docker build -t backend:latest .
docker tag backend:latest mindxweek1acr.azurecr.io/backend:latest

# Frontend
cd ../frontend
docker build --build-arg VITE_API_URL=https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net -t frontend:latest .
docker tag frontend:latest mindxweek1acr.azurecr.io/frontend:latest
```

### 2. Push to ACR

```bash
az acr login --name mindxweek1acr
docker push mindxweek1acr.azurecr.io/backend:latest
docker push mindxweek1acr.azurecr.io/frontend:latest
```

### 3. Connect to AKS

```bash
az aks get-credentials --resource-group mindx-dodd-rg --name mindx-week1-aks
```

### 4. Create Secrets

```bash
# ACR Secret
kubectl create secret docker-registry acr-secret \
  --docker-server=mindxweek1acr.azurecr.io \
  --docker-username=mindxweek1acr \
  --docker-password=$(az acr credential show --name mindxweek1acr --query "passwords[0].value" -o tsv) \
  --namespace=default \
  --dry-run=client -o yaml | kubectl apply -f -

# Backend Environment Variables
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
  --namespace=default \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 5. Deploy Applications

```bash
# Backend
kubectl apply -f infra/k8s/backend-deployment-default.yaml
kubectl apply -f infra/k8s/backend-service.yaml

# Frontend
kubectl apply -f infra/k8s/frontend-deployment-default.yaml
kubectl apply -f infra/k8s/frontend-service.yaml
```

### 6. Verify Deployment

```bash
# Check pods
kubectl get pods -n default

# Check services
kubectl get svc -n default

# Check logs
kubectl logs -f deployment/week1-backend-deployment -n default
kubectl logs -f deployment/frontend-deployment -n default
```

## 🔄 Update Deployment

### Update Backend

```bash
# Build new image
cd backend
docker build -t backend:v2 .
docker tag backend:v2 mindxweek1acr.azurecr.io/backend:v2
docker push mindxweek1acr.azurecr.io/backend:v2

# Update deployment
kubectl set image deployment/week1-backend-deployment backend=mindxweek1acr.azurecr.io/backend:v2 -n default
kubectl rollout restart deployment/week1-backend-deployment -n default
```

### Update Frontend

```bash
# Build new image
cd frontend
docker build --build-arg VITE_API_URL=https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net -t frontend:v2 .
docker tag frontend:v2 mindxweek1acr.azurecr.io/frontend:v2
docker push mindxweek1acr.azurecr.io/frontend:v2

# Update deployment
kubectl set image deployment/frontend-deployment frontend=mindxweek1acr.azurecr.io/frontend:v2 -n default
kubectl rollout restart deployment/frontend-deployment -n default
```

## 🔍 Troubleshooting

### Pods không start

```bash
# Xem pod events
kubectl describe pod <pod-name> -n default

# Xem logs
kubectl logs <pod-name> -n default
```

### Image không được pull

```bash
# Kiểm tra ACR secret
kubectl get secret acr-secret -n default

# Kiểm tra image có tồn tại
az acr repository show-tags --name mindxweek1acr --repository backend
az acr repository show-tags --name mindxweek1acr --repository frontend
```

### Service không có External IP

```bash
# Kiểm tra service type
kubectl get svc -n default

# Services phải là LoadBalancer type
```

## 📚 Related Documentation

- **Front Door Configuration**: `infra/front_door/note.md`
- **Backend README**: `backend/README.md`
- **Frontend README**: `frontend/README.md`
- **Authentication Flow**: `AUTHENTICATION_FLOW.md`

## 🔐 Security Notes

- **SESSION_SECRET**: Phải thay đổi thành giá trị ngẫu nhiên mạnh trong production
- **OIDC_CLIENT_SECRET**: Được lưu trong Kubernetes Secret, không commit vào code
- **HTTPS**: Được enforce bởi Azure Front Door
- **Cookies**: HttpOnly và Secure trong production

