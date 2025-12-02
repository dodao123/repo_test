import { Router, Request, Response } from 'express';
import * as client from 'openid-client';
import { authConfig } from './config.js';

const router = Router();

let oidcConfig: client.Configuration | null = null;

// In-memory store for code verifiers (session doesn't work across redirects)
const codeVerifierStore = new Map<string, { codeVerifier: string; expiresAt: number }>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of codeVerifierStore.entries()) {
    if (value.expiresAt < now) {
      codeVerifierStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Code Verifier Store] Cleaned up ${cleaned} expired entries`);
  }
}, 10 * 60 * 1000);

// Store discovery metadata separately
let discoveryMetadata: any = null;

// Initialize OpenID client
const initializeClient = async () => {
  if (oidcConfig) {
    console.log('[OpenID Client] Using cached configuration');
    return oidcConfig;
  }

  try {
    console.log('[OpenID Client] Starting discovery...');
    console.log('[OpenID Client]   Issuer:', authConfig.issuer);
    console.log('[OpenID Client]   Client ID:', authConfig.clientId);
    console.log('[OpenID Client]   Redirect URI:', authConfig.redirectUri);
    
    // Fetch discovery document manually to get all metadata
    const discoveryUrl = new URL(authConfig.issuer);
    discoveryUrl.pathname = '/.well-known/openid-configuration';
    
    console.log('[OpenID Client]   Discovery URL:', discoveryUrl.toString());
    const discoveryResponse = await fetch(discoveryUrl.toString());
    if (discoveryResponse.ok) {
      discoveryMetadata = await discoveryResponse.json();
      console.log('[OpenID Client]   Discovery metadata keys:', Object.keys(discoveryMetadata));
      console.log('[OpenID Client]   Userinfo endpoint:', discoveryMetadata.userinfo_endpoint);
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
    
    console.log('[OpenID Client] ✓ Discovery completed');
    console.log('[OpenID Client]   Configuration ready');
    
    return oidcConfig;
  } catch (error) {
    console.error('[OpenID Client] ✗ Discovery failed:', error);
    if (error instanceof Error) {
      console.error('[OpenID Client]   Error message:', error.message);
      console.error('[OpenID Client]   Error stack:', error.stack);
    }
    throw error;
  }
};

// Login endpoint - redirects to OpenID provider
router.get('/login', async (req: Request, res: Response) => {
  console.log('\n========== LOGIN REQUEST START ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Session ID:', (req.session as any)?.id || 'No session ID');
  
  try {
    console.log('[1/6] Initializing OpenID client...');
    const oidcConfig = await initializeClient();
    console.log('[1/6] ✓ OpenID client initialized');
    
    console.log('[2/6] Generating PKCE code verifier and challenge...');
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    console.log('[2/6] ✓ Code verifier generated:', codeVerifier.substring(0, 20) + '...');
    console.log('[2/6] ✓ Code challenge generated:', codeChallenge.substring(0, 20) + '...');

    console.log('[3/6] Generating state parameter...');
    // Generate a random state to store codeVerifier (use full length for better security)
    const state = client.randomPKCECodeVerifier();
    console.log('[3/6] ✓ State generated:', state.substring(0, 20) + '...');

    console.log('[4/6] Building authorization URL...');
    const authUrl = client.buildAuthorizationUrl(oidcConfig, {
      redirect_uri: authConfig.redirectUri,
      scope: authConfig.scope,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state, // Include state in OAuth flow
    });
    console.log('[4/6] ✓ Authorization URL built');
    console.log('[4/6]   Redirect URI:', authConfig.redirectUri);
    console.log('[4/6]   Scope:', authConfig.scope);
    console.log('[4/6]   State:', state.substring(0, 20) + '...');
    console.log('[4/6]   Full Auth URL:', authUrl.toString().substring(0, 150) + '...');

    console.log('[5/6] Storing code verifier in memory store...');
    // Store codeVerifier with state as key (expires in 10 minutes)
    codeVerifierStore.set(state, {
      codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });
    console.log('[5/6] ✓ Code verifier stored in memory');
    console.log('[5/6]   Store size:', codeVerifierStore.size);
    console.log('[5/6]   State key:', state.substring(0, 20) + '...');

    console.log('[6/6] Sending auth URL to client...');
    const response = { authUrl: authUrl.toString() };
    console.log('[6/6] ✓ Response prepared');
    
    console.log('[6/6] Login request completed successfully');
    console.log('========== LOGIN REQUEST END ==========\n');
    
    res.json(response);
  } catch (error) {
    console.error('\n========== LOGIN ERROR ==========');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    console.error('========== LOGIN ERROR END ==========\n');
    
    // Check if error is due to auth server being unavailable
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthServerDown = 
      errorMessage.includes('unexpected HTTP response status code') ||
      errorMessage.includes('OAUTH_RESPONSE_IS_NOT_CONFORM') ||
      errorMessage.includes('404') ||
      errorMessage.includes('503');
    
    if (isAuthServerDown) {
      // Auth server is down or discovery endpoint not available
      res.status(503).json({ 
        error: 'Authentication service is currently unavailable',
        details: 'The authentication server (https://id-dev.mindx.edu.vn) is not responding. Please try again later.',
        code: 'AUTH_SERVER_UNAVAILABLE'
      });
    } else {
      // Other errors
      res.status(500).json({ 
        error: 'Failed to initiate login',
        details: errorMessage,
        code: 'LOGIN_ERROR'
      });
    }
  }
});

// Callback endpoint - handles OAuth callback and redirects to frontend
router.get('/callback', async (req: Request, res: Response) => {
  console.log('\n========== CALLBACK REQUEST START ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Session ID:', (req.session as any)?.id || 'No session ID');
  console.log('Request URL:', req.url);
  console.log('Request headers:', {
    host: req.get('host'),
    protocol: req.protocol,
    'user-agent': req.get('user-agent')?.substring(0, 50) + '...',
  });
  
  try {
    console.log('[1/8] Initializing OpenID client...');
    const oidcConfig = await initializeClient();
    console.log('[1/8] ✓ OpenID client initialized');

    console.log('[2/8] Building callback URL from request...');
    const protocol = req.protocol;
    const host = req.get('host');
    
    // Build URL to match the registered redirect_uri exactly
    // The registered redirect_uri is: http://localhost:3000/auth/callback
    // So we need to ensure the URL path is /auth/callback, not just /callback
    const registeredRedirectUri = new URL(authConfig.redirectUri);
    const callbackUrl = new URL(registeredRedirectUri.origin + registeredRedirectUri.pathname);
    
    // Copy all query parameters from the request
    for (const [key, value] of new URL(req.url, `${protocol}://${host}`).searchParams.entries()) {
      callbackUrl.searchParams.set(key, value);
    }
    
    const url = callbackUrl;
    console.log('[2/8] ✓ Callback URL built');
    console.log('[2/8]   Full URL:', url.toString());
    console.log('[2/8]   Origin:', url.origin);
    console.log('[2/8]   Pathname:', url.pathname);
    console.log('[2/8]   Registered redirect URI:', authConfig.redirectUri);
    console.log('[2/8]   URLs match:', url.origin + url.pathname === registeredRedirectUri.origin + registeredRedirectUri.pathname);
    console.log('[2/8]   Query params:', Object.fromEntries(url.searchParams.entries()));
    
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    console.log('[2/8]   Code:', code ? code.substring(0, 20) + '...' : 'MISSING');
    console.log('[2/8]   State:', stateParam ? stateParam.substring(0, 20) + '...' : 'MISSING');

    if (!code) {
      console.error('[2/8] ✗ Authorization code missing');
      
      // Check if user already has a valid access token (already authenticated)
      const existingToken = req.cookies?.accessToken;
      if (existingToken) {
        console.log('[2/8] User already has accessToken cookie, redirecting to /protected');
        console.log('========== CALLBACK REQUEST END (ALREADY AUTHENTICATED) ==========\n');
        return res.redirect(`${authConfig.frontendUrl}/protected`);
      }
      
      // No code and no existing token - redirect to protected anyway
      // Frontend will handle auth check
      console.log('[2/8] No code but redirecting to /protected - frontend will verify auth');
      console.log('========== CALLBACK REQUEST END (NO CODE) ==========\n');
      return res.redirect(`${authConfig.frontendUrl}/protected`);
    }

    console.log('[3/8] Retrieving code verifier from memory store...');
    console.log('[3/8]   State from URL:', stateParam ? stateParam.substring(0, 20) + '...' : 'MISSING');
    console.log('[3/8]   Store size:', codeVerifierStore.size);
    console.log('[3/8]   Available states:', Array.from(codeVerifierStore.keys()).map(s => s.substring(0, 10) + '...'));

    if (!stateParam) {
      console.error('[3/8] ✗ State parameter missing from callback URL');
      console.log('========== CALLBACK REQUEST END (ERROR) ==========\n');
      return res.redirect(`${authConfig.frontendUrl}/login?error=state_missing`);
    }

    // Retrieve codeVerifier from store using state
    const stored = codeVerifierStore.get(stateParam);
    console.log('[3/8]   Code verifier lookup result:', stored ? 'FOUND' : 'NOT FOUND');

    if (!stored) {
      console.error('[3/8] ✗ Code verifier not found for state');
      console.error('[3/8]   State:', stateParam.substring(0, 20) + '...');
      console.log('========== CALLBACK REQUEST END (ERROR) ==========\n');
      return res.redirect(`${authConfig.frontendUrl}/login?error=code_verifier_missing`);
    }

    // Check if expired
    if (stored.expiresAt < Date.now()) {
      console.error('[3/8] ✗ Code verifier expired');
      console.error('[3/8]   Expires at:', new Date(stored.expiresAt).toISOString());
      console.error('[3/8]   Current time:', new Date().toISOString());
      codeVerifierStore.delete(stateParam);
      console.log('========== CALLBACK REQUEST END (ERROR) ==========\n');
      return res.redirect(`${authConfig.frontendUrl}/login?error=code_verifier_expired`);
    }

    const storedCodeVerifier = stored.codeVerifier;
    console.log('[3/8] ✓ Code verifier retrieved from memory store');
    console.log('[3/8]   Code verifier preview:', storedCodeVerifier.substring(0, 20) + '...');
    console.log('[3/8]   Expires at:', new Date(stored.expiresAt).toISOString());

    console.log('[4/8] Exchanging authorization code for tokens...');
    console.log('[4/8]   Using code verifier:', storedCodeVerifier.substring(0, 20) + '...');
    console.log('[4/8]   Registered redirect URI:', authConfig.redirectUri);
    console.log('[4/8]   Callback URL origin+path:', url.origin + url.pathname);
    console.log('[4/8]   Expected state:', stateParam.substring(0, 20) + '...');
    
    const tokenSet = await client.authorizationCodeGrant(
      oidcConfig,
      url,
      {
        pkceCodeVerifier: storedCodeVerifier,
        expectedState: stateParam, // Validate state parameter
      }
    );
    
    // Clean up after successful use
    codeVerifierStore.delete(stateParam);
    console.log('[4/8]   Code verifier removed from store after successful use');
    console.log('[4/8] ✓ Tokens received');
    console.log('[4/8]   Has access token:', !!tokenSet.access_token);
    console.log('[4/8]   Has ID token:', !!tokenSet.id_token);
    console.log('[4/8]   Token type:', tokenSet.token_type);
    console.log('[4/8]   Expires in:', tokenSet.expires_in, 'seconds');

    console.log('[5/8] Fetching user info...');
    let userInfo: any;
    
    // First, try to fetch from userinfo endpoint with access token
    // This usually has more complete user information
    try {
      console.log('[5/8]   Attempting to fetch userinfo from endpoint...');
      
      // Get userinfo endpoint from discovery metadata (stored separately)
      let userinfoEndpoint = discoveryMetadata?.userinfo_endpoint;
      
      console.log('[5/8]   Discovery metadata userinfo_endpoint:', userinfoEndpoint);
      
      // If not found, try common endpoints
      if (!userinfoEndpoint) {
        console.log('[5/8]   Userinfo endpoint not in discovery metadata, trying common paths...');
        const issuerUrl = new URL(authConfig.issuer);
        const possibleEndpoints = [
          `${issuerUrl.origin}/userinfo`,
          `${issuerUrl.origin}/api/userinfo`,
          `${issuerUrl.origin}/oauth/userinfo`,
          `${issuerUrl.origin}/api/v1/userinfo`,
          `${issuerUrl.origin}/connect/userinfo`,
        ];
        
        for (const endpoint of possibleEndpoints) {
          try {
            console.log('[5/8]     Trying endpoint:', endpoint);
            const testResponse = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${tokenSet.access_token}`,
                'Accept': 'application/json',
              },
            });
            
            console.log('[5/8]     Response status:', testResponse.status);
            
            if (testResponse.ok) {
              userinfoEndpoint = endpoint;
              console.log('[5/8]   ✓ Found userinfo endpoint:', endpoint);
              break;
            } else {
              const errorText = await testResponse.text();
              console.log('[5/8]     Response error:', errorText.substring(0, 100));
            }
          } catch (err: any) {
            console.log('[5/8]     Fetch error:', err?.message);
            // Continue to next endpoint
          }
        }
      }
      
      if (userinfoEndpoint) {
        console.log('[5/8]   Using userinfo endpoint:', userinfoEndpoint);
        
        const response = await fetch(userinfoEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenSet.access_token}`,
            'Accept': 'application/json',
          },
        });
        
        if (response.ok) {
          const userInfoData = await response.json();
          console.log('[5/8]   Raw userinfo response:', JSON.stringify(userInfoData, null, 2));
          
          // Map MindX response to OpenID Connect format
          userInfo = {
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
          
          console.log('[5/8] ✓ User info retrieved from userinfo endpoint');
        } else {
          const errorText = await response.text();
          console.log('[5/8]   Userinfo endpoint returned:', response.status, response.statusText);
          console.log('[5/8]   Error response:', errorText.substring(0, 200));
          throw new Error(`Userinfo request failed: ${response.status}`);
        }
      } else {
        console.log('[5/8]   Userinfo endpoint not found, will use ID token');
        throw new Error('Userinfo endpoint not found');
      }
    } catch (userinfoError: any) {
      console.log('[5/8]   Userinfo endpoint fetch failed, trying ID token...');
      console.log('[5/8]   Error:', userinfoError?.message || userinfoError);
      
      // Fallback: Extract from ID token
      if (tokenSet.id_token) {
        try {
          // Decode ID token (without verification for now, in production should verify signature)
          const idTokenParts = tokenSet.id_token.split('.');
          if (idTokenParts.length === 3) {
            // Decode the payload (second part)
            const payload = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString('utf-8'));
            console.log('[5/8]   ID token payload decoded');
            console.log('[5/8]   ID token claims:', Object.keys(payload));
            
            // Map ID token claims to user info
            // MindX may use different field names
            userInfo = {
              sub: payload.sub || payload.id || payload.firebaseId || payload.email || 'unknown',
              email: payload.email,
              name: payload.name || payload.displayName || payload.username || payload.email,
              username: payload.username,
              displayName: payload.displayName,
              firebaseId: payload.firebaseId,
              // Include all claims from ID token
              ...payload,
            };
            
            console.log('[5/8] ✓ User info extracted from ID token');
          } else {
            throw new Error('Invalid ID token format');
          }
        } catch (decodeError: any) {
          console.error('[5/8] ✗ ID token decode failed:', decodeError?.message || decodeError);
          // Create minimal user info with sub from ID token if available
          const idTokenParts = tokenSet.id_token?.split('.');
          if (idTokenParts && idTokenParts.length === 3) {
            try {
              const payload = JSON.parse(Buffer.from(idTokenParts[1], 'base64').toString('utf-8'));
              userInfo = {
                sub: payload.sub || 'unknown',
                email: payload.email,
                name: payload.name || payload.displayName || payload.username,
              };
              console.log('[5/8] ✓ Minimal user info created from ID token');
            } catch {
              userInfo = { sub: 'unknown' };
            }
          } else {
            userInfo = { sub: 'unknown' };
          }
        }
      } else {
        throw new Error('ID token not available');
      }
    }
    
    console.log('[5/8] ✓ User info retrieved');
    console.log('[5/8]   User ID (sub):', userInfo.sub);
    console.log('[5/8]   Email:', userInfo.email || 'N/A');
    console.log('[5/8]   Name:', userInfo.name || 'N/A');

    console.log('[6/8] Storing tokens in session...');
    (req.session as any).accessToken = tokenSet.access_token;
    (req.session as any).user = userInfo;
    console.log('[6/8] ✓ Tokens stored in session');
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('[6/8] ✗ Error saving session:', err);
      } else {
        console.log('[6/8] ✓ Session saved successfully');
      }
    });

    console.log('[7/8] Setting access token in cookie...');
    // Set access token in HTTP-only cookie for security
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      // In development with HTTP, we can't use sameSite: 'none' (requires secure: true)
      // Use 'lax' which works for same-site requests (frontend and backend on localhost)
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
    
    // In development, set domain to 'localhost' (without port) so cookie works for both ports
    // In production, you may want to set domain explicitly
    if (!isProduction) {
      cookieOptions.domain = 'localhost';
    } else if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
    
    // Set cookie BEFORE redirect
    res.cookie('accessToken', tokenSet.access_token, cookieOptions);
    console.log('[7/8] ✓ Access token set in cookie');
    console.log('[7/8]   Cookie options:', JSON.stringify(cookieOptions, null, 2));
    console.log('[7/8]   Token preview:', tokenSet.access_token.substring(0, 20) + '...');
    
    // Log Set-Cookie header to verify
    const setCookieHeader = res.getHeader('Set-Cookie');
    console.log('[7/8]   Set-Cookie header:', setCookieHeader);

    console.log('[8/8] Preparing redirect to frontend...');
    // Redirect to frontend callback route (using /callback instead of /auth/callback
    // to avoid Azure Front Door routing conflict - AFD routes /auth/* to backend)
    const redirectUrl = `${authConfig.frontendUrl}/callback`;
    console.log('[8/8] ✓ Redirect URL prepared');
    console.log('[8/8]   Frontend URL:', authConfig.frontendUrl);
    console.log('[8/8]   Redirect URL:', redirectUrl);
    console.log('[8/8]   Note: Using /callback to avoid Azure Front Door routing /auth/* to backend');

    console.log('[9/9] Redirecting to frontend...');
    console.log('[9/9] ✓ Callback completed successfully');
    console.log('========== CALLBACK REQUEST END (SUCCESS) ==========\n');
    
    // Ensure cookie is sent before redirect
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('\n========== CALLBACK ERROR ==========');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    
    if (error?.cause) {
      console.error('Error cause:', error.cause);
    }
    
    if (error?.error) {
      console.error('OAuth error:', error.error);
      console.error('OAuth error description:', error.error_description);
      console.error('OAuth status:', error.status);
    }
    
    if (error?.stack) {
      console.error('Error stack:', error.stack);
    }
    
    console.error('Request details:', {
      url: req.url,
      sessionId: (req.session as any)?.id,
      hasCodeVerifier: !!(req.session as any)?.codeVerifier,
    });
    
    console.error('========== CALLBACK ERROR END ==========\n');
    res.redirect(`${authConfig.frontendUrl}/login?error=authentication_failed`);
  }
});

// Get current user info
router.get('/me', async (req: Request, res: Response) => {
  console.log('\n========== USER INFO REQUEST START ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request cookies:', req.cookies);
  console.log('Request headers cookie:', req.headers.cookie);
  
  try {
    // Try to get token from cookie first, then fallback to Authorization header
    let token = req.cookies?.accessToken;
    
    console.log('[1/3] Token from cookie:', token ? token.substring(0, 20) + '...' : 'NOT FOUND');
    
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
      console.log('[1/3] Token from Authorization header:', token ? token.substring(0, 20) + '...' : 'NOT FOUND');
    }

    if (!token) {
      console.error('[1/3] ✗ Access token missing');
      console.error('[1/3]   Available cookies:', Object.keys(req.cookies || {}));
      console.log('========== USER INFO REQUEST END (ERROR) ==========\n');
      return res.status(401).json({ error: 'Access token required' });
    }

    console.log('[1/3] Access token received:', token.substring(0, 20) + '...');

    const oidcConfig = await initializeClient();
    
    console.log('[2/3] Fetching userinfo from endpoint...');
    
    // Get userinfo endpoint from discovery metadata (stored separately)
    let userinfoEndpoint = discoveryMetadata?.userinfo_endpoint;
    
    console.log('[2/3]   Discovery metadata userinfo_endpoint:', userinfoEndpoint);
    
    // If not found, try common endpoints
    if (!userinfoEndpoint) {
      console.log('[2/3]   Userinfo endpoint not in discovery metadata, trying common paths...');
      const issuerUrl = new URL(authConfig.issuer);
      const possibleEndpoints = [
        `${issuerUrl.origin}/userinfo`,
        `${issuerUrl.origin}/api/userinfo`,
        `${issuerUrl.origin}/oauth/userinfo`,
        `${issuerUrl.origin}/api/v1/userinfo`,
        `${issuerUrl.origin}/connect/userinfo`,
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log('[2/3]     Trying endpoint:', endpoint);
          const testResponse = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          
          console.log('[2/3]     Response status:', testResponse.status);
          
          if (testResponse.ok) {
            userinfoEndpoint = endpoint;
            console.log('[2/3]   ✓ Found userinfo endpoint:', endpoint);
            break;
          } else {
            const errorText = await testResponse.text();
            console.log('[2/3]     Response error:', errorText.substring(0, 100));
          }
        } catch (err: any) {
          console.log('[2/3]     Fetch error:', err?.message);
          // Continue to next endpoint
        }
      }
    }
    
    let userInfo: any;
    
    if (userinfoEndpoint) {
      console.log('[2/3]   Using userinfo endpoint:', userinfoEndpoint);
      
      try {
        const response = await fetch(userinfoEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        
        console.log('[2/3]   Response status:', response.status);
        
        if (response.ok) {
          const userInfoData = await response.json();
          // console.log('[2/3]   Raw userinfo response:', JSON.stringify(userInfoData, null, 2));
          
          // Map MindX response to OpenID Connect format
          userInfo = {
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
          
          console.log('[2/3] ✓ User info retrieved and mapped');
        } else {
          const errorText = await response.text();
          console.error('[2/3] ✗ Userinfo request failed:', response.status, response.statusText);
          console.error('[2/3]   Error response:', errorText);
          throw new Error(`Userinfo request failed: ${response.status}`);
        }
      } catch (fetchError: any) {
        console.error('[2/3] ✗ Fetch error:', fetchError?.message || fetchError);
        throw fetchError;
      }
    } else {
      console.error('[2/3] ✗ Userinfo endpoint not found');
      // Return minimal user info
      userInfo = {
        sub: 'unknown',
        email: undefined,
        name: undefined,
      };
      console.log('[2/3]   Using minimal user info');
    }

    console.log('[3/3] ✓ User info ready');
    console.log('[3/3]   User ID (sub):', userInfo.sub);
    console.log('[3/3]   Email:', userInfo.email || 'N/A');
    console.log('[3/3]   Name:', userInfo.name || 'N/A');
    console.log('========== USER INFO REQUEST END (SUCCESS) ==========\n');

    res.json({ user: userInfo });
  } catch (error: any) {
    console.error('\n========== USER INFO ERROR ==========');
    console.error('Error:', error?.message || error);
    if (error?.stack) {
      console.error('Stack:', error.stack);
    }
    console.error('========== USER INFO ERROR END ==========\n');
    res.status(401).json({ error: 'Invalid token', details: error?.message });
  }
});

// Logout endpoint - clears the access token cookie
router.post('/logout', (req: Request, res: Response) => {
  console.log('\n========== LOGOUT REQUEST ==========');
  console.log('Timestamp:', new Date().toISOString());
  
  const isProduction = process.env.NODE_ENV === 'production';
  const clearCookieOptions: any = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };
  
  // Use the same domain as when setting the cookie
  if (!isProduction) {
    clearCookieOptions.domain = 'localhost';
  } else if (process.env.COOKIE_DOMAIN) {
    clearCookieOptions.domain = process.env.COOKIE_DOMAIN;
  }
  
  res.clearCookie('accessToken', clearCookieOptions);
  console.log('✓ Access token cookie cleared');
  console.log('   Cookie clear options:', JSON.stringify(clearCookieOptions, null, 2));
  console.log('========== LOGOUT REQUEST END ==========\n');
  res.json({ message: 'Logged out successfully' });
});

export default router;

