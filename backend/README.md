# Backend Setup

## Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### Required Variables

- `PORT`: Backend server port (default: 3000)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)
- `OIDC_ISSUER`: OpenID Connect issuer URL
- `OIDC_CLIENT_ID`: OpenID Connect client ID
- `OIDC_CLIENT_SECRET`: OpenID Connect client secret
- `OIDC_REDIRECT_URI`: OAuth callback URL (default: http://localhost:3000/auth/callback)
- `SESSION_SECRET`: Secret for session encryption (change in production!)

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

