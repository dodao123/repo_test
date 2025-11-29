# Week 1: Fullstack Application on Azure Cloud

## 📋 Project Overview

This is a fullstack TypeScript application deployed on Azure Cloud with:
- **Backend**: Node.js/Express API with OpenID Connect authentication
- **Frontend**: React SPA with TypeScript
- **Infrastructure**: Azure Kubernetes Service (AKS) with Azure Front Door
- **Authentication**: OpenID Connect via MindX Identity Provider

## 🌐 Live Application

- **URL**: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net
- **Backend API**: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/api/*
- **Health Check**: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/api/health

## ✨ Features

- ✅ **HTTPS**: All endpoints enforce HTTPS via Azure Front Door
- ✅ **OpenID Authentication**: Login via MindX Identity Provider
- ✅ **Protected Routes**: Frontend protected routes with authentication check
- ✅ **API Authorization**: Backend validates OpenID tokens for protected endpoints
- ✅ **Session Management**: HttpOnly cookies for secure token storage
- ✅ **PKCE Flow**: Secure OAuth 2.0 authorization code flow

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│      Azure Front Door               │
│  (HTTPS, Routing, Load Balancing)   │
└──────┬──────────────────┬────────────┘
       │                  │
       ▼                  ▼
┌─────────────┐   ┌─────────────┐
│  Backend    │   │  Frontend   │
│  Service    │   │  Service    │
│ (AKS Pods) │   │ (AKS Pods)   │
└─────────────┘   └─────────────┘
```

**Routing:**
- `/api/*` → Backend Service
- `/auth/*` → Backend Service  
- `/*` → Frontend Service

## 🚀 Quick Start

### Prerequisites

- Azure CLI installed and logged in
- kubectl installed
- Docker installed and running
- Access to Azure resources (AKS, ACR)

### Deploy Everything (One Command)

**Windows:**
```powershell
.\build-and-deploy.ps1
```

**Linux/Mac:**
```bash
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

### Step by Step

1. **Build and Push Images:**
   ```powershell
   .\build-and-push.ps1
   ```

2. **Deploy to AKS:**
   ```powershell
   .\deploy.ps1
   ```

## 📁 Project Structure

```
Week_1/
├── backend/                 # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── auth/           # Authentication logic
│   │   │   ├── config.ts   # OIDC configuration
│   │   │   ├── routes.ts   # Auth routes (login, callback, logout)
│   │   │   └── middleware.ts  # Token validation middleware
│   │   └── index.ts        # Express server
│   └── Dockerfile
│
├── frontend/                # Frontend (React)
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Auth state management
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx  # Route protection
│   │   ├── LoginComponent/  # Login UI
│   │   ├── Protected_pages/ # Protected content
│   │   └── pages/
│   │       └── Callback.tsx  # OAuth callback handler
│   └── Dockerfile
│
├── infra/                   # Infrastructure as Code
│   ├── k8s/                # Kubernetes manifests
│   │   ├── backend-deployment-default.yaml
│   │   ├── frontend-deployment-default.yaml
│   │   ├── backend-service.yaml
│   │   └── frontend-service.yaml
│   └── front_door/
│       └── note.md        # Front Door configuration
│
├── build-and-push.ps1      # Build and push Docker images
├── deploy.ps1              # Deploy to AKS
├── build-and-deploy.ps1    # All-in-one script
└── DEPLOYMENT.md           # Detailed deployment guide
```

## 🔐 Authentication Flow

1. User clicks "Đăng nhập với MindX" on frontend
2. Frontend calls `/auth/login` on backend
3. Backend generates PKCE challenge and redirects to MindX
4. User authenticates on MindX
5. MindX redirects to `/auth/callback` with authorization code
6. Backend exchanges code for access token
7. Backend sets httpOnly cookie with token
8. Backend redirects to frontend `/auth/callback`
9. Frontend calls `/auth/me` to get user info
10. User is authenticated and can access protected routes

**Detailed flow**: See [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md)

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Complete deployment guide
- **[AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md)**: Authentication flow details
- **[backend/README.md](./backend/README.md)**: Backend documentation
- **[frontend/README.md](./frontend/README.md)**: Frontend documentation
- **[infra/front_door/note.md](./infra/front_door/note.md)**: Azure Front Door configuration

## 🧪 Testing

### Test Authentication

1. Visit: https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/login
2. Click "Đăng nhập với MindX"
3. Login with MindX credentials
4. Should redirect to protected page

### Test API

```bash
# Health check
curl https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/api/health

# Protected endpoint (requires authentication)
curl https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net/api/protected
```

## 🔧 Configuration

### Backend Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (production/development)
- `FRONTEND_URL`: Frontend URL for CORS and redirects
- `OIDC_ISSUER`: MindX Identity Provider URL
- `OIDC_CLIENT_ID`: OAuth client ID
- `OIDC_CLIENT_SECRET`: OAuth client secret
- `OIDC_REDIRECT_URI`: OAuth callback URL
- `OIDC_SCOPE`: OAuth scopes
- `SESSION_SECRET`: Session encryption secret

### Frontend Environment Variables

- `VITE_API_URL`: Backend API URL (set during Docker build)

## 🐛 Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md#-troubleshooting) for common issues and solutions.

## 📝 Acceptance Criteria Status

- ✅ Back-end API deployed and accessible via public HTTPS endpoint
- ✅ Front-end React web app deployed and accessible via public HTTPS domain
- ✅ HTTPS enforced for all endpoints
- ✅ Authentication integrated with OpenID (https://id-dev.mindx.edu.vn)
- ✅ Users can log in and log out via front-end using OpenID
- ✅ Authenticated users can access protected routes/pages
- ✅ Back-end API validates and authorizes requests using OpenID token
- ✅ All services running on Azure Cloud infrastructure
- ✅ Deployment scripts/configs committed to repository
- ✅ Documentation provided for setup, deployment, and authentication flow

## 👥 Contributors

DAO DUC DO - Week 1 Project TESTING - MindX
