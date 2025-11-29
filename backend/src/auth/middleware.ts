import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as client from 'openid-client';
import { authConfig } from './config.js';

// Cache for OIDC config
let oidcConfig: client.Configuration | null = null;
let discoveryMetadata: any = null;

// Initialize OpenID client (reuse from routes)
const initializeClient = async () => {
  if (oidcConfig) {
    return oidcConfig;
  }

  try {
    // Fetch discovery document to get userinfo endpoint
    const discoveryUrl = new URL(authConfig.issuer);
    discoveryUrl.pathname = '/.well-known/openid-configuration';
    
    const discoveryResponse = await fetch(discoveryUrl.toString());
    if (discoveryResponse.ok) {
      discoveryMetadata = await discoveryResponse.json();
    }
    
    oidcConfig = await client.discovery(
      new URL(authConfig.issuer),
      authConfig.clientId,
      {
        client_secret: authConfig.clientSecret,
        redirect_uris: [authConfig.redirectUri],
        response_types: ['code'],
      },
      client.ClientSecretPost(authConfig.clientSecret)
    );
    
    return oidcConfig;
  } catch (error) {
    console.error('[Middleware] Failed to initialize OpenID client:', error);
    throw error;
  }
};

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    name?: string;
    [key: string]: any;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Try to get token from cookie first, then fallback to Authorization header
  let token = req.cookies?.accessToken;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // First, try to decode as JWT
    let decoded: any = null;
    try {
      const jwtDecoded = jwt.decode(token, { complete: true });
      if (jwtDecoded && typeof jwtDecoded !== 'string' && jwtDecoded.payload) {
        decoded = jwtDecoded.payload;
        console.log('[Middleware] Token decoded as JWT, sub:', decoded.sub);
      }
    } catch (jwtError) {
      // Not a JWT, will validate via userinfo endpoint
      console.log('[Middleware] Token is not a JWT, will validate via userinfo endpoint');
    }

    // If JWT decode succeeded and has sub, use it
    if (decoded && decoded.sub) {
      req.user = decoded;
      return next();
    }

    // Otherwise, validate token by fetching userinfo
    console.log('[Middleware] Validating token via userinfo endpoint...');
    
    const config = await initializeClient();
    
    // Get userinfo endpoint
    let userinfoEndpoint = discoveryMetadata?.userinfo_endpoint;
    
    if (!userinfoEndpoint) {
      // Try common paths
      const issuerUrl = new URL(authConfig.issuer);
      const possibleEndpoints = [
        `${issuerUrl.origin}/userinfo`,
        `${issuerUrl.origin}/api/userinfo`,
        `${issuerUrl.origin}/oauth/userinfo`,
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          const testResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          
          if (testResponse.ok) {
            userinfoEndpoint = endpoint;
            break;
          }
        } catch {
          // Continue
        }
      }
    }

    if (userinfoEndpoint) {
      const userInfoResponse = await fetch(userinfoEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (userInfoResponse.ok) {
        const userInfoData = await userInfoResponse.json();
        
        // Map to standard format
        req.user = {
          sub: String(userInfoData.id || userInfoData.firebaseId || userInfoData.email || 'unknown'),
          email: userInfoData.email,
          name: userInfoData.displayName || userInfoData.username || userInfoData.email,
          username: userInfoData.username,
          displayName: userInfoData.displayName,
          firebaseId: userInfoData.firebaseId,
          permissions: userInfoData.permissions,
          roles: userInfoData.roles,
          businessUnit: userInfoData.businessUnit,
          ...userInfoData,
        };
        
        console.log('[Middleware] Token validated, user:', req.user?.sub);
        return next();
      } else {
        const errorText = await userInfoResponse.text();
        console.error('[Middleware] Userinfo validation failed:', userInfoResponse.status, errorText);
        return res.status(401).json({ error: 'Invalid token', details: 'Userinfo validation failed' });
      }
    } else {
      // If no userinfo endpoint and JWT decode failed, accept token if it exists
      // (for development - in production, always validate)
      console.log('[Middleware] No userinfo endpoint, accepting token without validation');
      req.user = {
        sub: decoded?.sub || 'unknown',
        email: decoded?.email,
        name: decoded?.name,
        ...decoded,
      };
      return next();
    }
  } catch (error: any) {
    console.error('[Middleware] Authentication error:', error?.message || error);
    return res.status(403).json({ error: 'Invalid or expired token', details: error?.message });
  }
};

