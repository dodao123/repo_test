# Week 1 — Azure Front Door Configuration

## Endpoint
- https://dodd-api-endpoint-a7b8hvcdc9fugjbr.z03.azurefd.net

## Origins (LoadBalancer Services)

### Backend Origin
- **IP:** 4.144.193.135
- **Service:** week1-backend-service
- **Port:** 80
- **Health Probe:** /api/health hoặc /health
- **Routes:** 
  - `/api/*` → Backend
  - `/auth/*` → Backend

### Frontend Origin
- **IP:** 135.171.162.240
- **Service:** frontend-service
- **Port:** 80
- **Health Probe:** /health
- **Routes:**
  - `/*` → Frontend (catch-all, nhưng không match `/api/*` và `/auth/*`)

## Routing Rules

Azure Front Door cần được cấu hình với routing rules:

1. **Backend Routes:**
   - Pattern: `/api/*`
   - Origin: 4.144.193.135:80
   - Pattern: `/auth/*`
   - Origin: 4.144.193.135:80

2. **Frontend Routes:**
   - Pattern: `/*` (catch-all, nhưng có priority thấp hơn `/api/*` và `/auth/*`)
   - Origin: 135.171.162.240:80

## Settings
- Redirect: HTTPS only
- Forwarding protocol: HTTP only (Front Door → Origin)
- HTTPS: Enabled (Front Door → Client)
