// Get port from env or default to 3000
const getPort = () => {
  if (typeof process !== 'undefined' && process.env?.PORT) {
    return process.env.PORT;
  }
  return '3000';
};

// Calculate redirect URI - MUST be backend URL, not frontend URL
// OAuth provider will redirect to this URL, which is handled by backend
const getRedirectUri = () => {
  if (process.env.OIDC_REDIRECT_URI) {
    return process.env.OIDC_REDIRECT_URI;
  }
  
  // Default to backend URL (where the callback handler is)
  const backendUrl = `http://localhost:${getPort()}`;
  return `${backendUrl}/auth/callback`;
};

export const authConfig = {
  issuer: process.env.OIDC_ISSUER || '',
  clientId: process.env.OIDC_CLIENT_ID || '',
  clientSecret: process.env.OIDC_CLIENT_SECRET || '',
  redirectUri: getRedirectUri(),
  frontendUrl: process.env.FRONTEND_URL || `http://localhost:${getPort()}`,
  scope: process.env.OIDC_SCOPE || 'openid profile email',
};

