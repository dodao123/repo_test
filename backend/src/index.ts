import 'dotenv/config';
import appInsights from 'applicationinsights';
import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import authRoutes from './auth/routes.js';
import todoRoutes from './interfaces/todo-routes.js';
import { authenticateToken, AuthRequest } from './auth/middleware.js';

// ================== INIT APP INSIGHTS FIRST ==================
let appInsightsClient: any = null;

if (process.env.APPINSIGHTS_CONNECTION_STRING) {
  try {
    appInsights
      .setup(process.env.APPINSIGHTS_CONNECTION_STRING)
      .setAutoCollectRequests(false) // Disable auto-collect, we track manually
      .setAutoCollectDependencies(true)
      .setAutoCollectExceptions(true)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectConsole(true)
      .setSendLiveMetrics(true)
      .setUseDiskRetryCaching(true) // Enable disk retry for better reliability
      .start();

    appInsightsClient = appInsights.defaultClient;

    // Enable verbose logging for debugging
    if (appInsightsClient) {
      appInsightsClient.config.enableLogger = true;
    }

    console.log('✅ Azure Application Insights initialized (v2.7.0)');
    console.log('✅ DefaultClient available:', !!appInsightsClient);
    console.log('✅ Connection String:', process.env.APPINSIGHTS_CONNECTION_STRING.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Failed to initialize Application Insights:', error);
  }
} else {
  console.log('⚠️ Azure Application Insights not configured - APPINSIGHTS_CONNECTION_STRING missing');
}

// =============================================================

const app = express();
const port = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const sessionSecret = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

// Helper function to format timestamp (YYYY-MM-DD HH:mm:ss.SSS)
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// ----------- MANUAL REQUEST TRACKING (v2.7.0 API) ----------
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  const requestTime = new Date();
  const timestamp = formatTimestamp(requestTime);
  const timestampISO = requestTime.toISOString(); // Keep ISO for AppInsights
  let responseBody: any = null;

  // Capture response body
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.json = function (body: any) {
    responseBody = JSON.stringify(body);
    return originalJson.call(this, body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const resultCode = res.statusCode;
    const isSuccess = resultCode < 400;

    // Format response body for logging (truncate if too long)
    let responseBodyStr = '';

    if (responseBody !== undefined && responseBody !== null) {
      try {
        const raw = typeof responseBody === 'string'
          ? responseBody
          : JSON.stringify(responseBody) ?? '';

        responseBodyStr = raw.length > 200 ? raw.slice(0, 200) + '...' : raw;
      } catch {
        responseBodyStr = '[unstringifiable response]';
      }
    }


    if (appInsightsClient) {
      try {
        // Track request with custom properties
        appInsightsClient.trackRequest({
          name: `${req.method} ${req.url}`,
          url: req.url,
          duration,
          resultCode: resultCode,
          success: isSuccess,
          properties: {
            method: req.method,
            path: req.path,
            userAgent: req.get('user-agent') || 'unknown',
            timestamp: timestampISO,
            responseBody: responseBodyStr,
          }
        });

        // Flush ALL telemetry immediately to ensure it's sent
        appInsightsClient.flush();

        const payloadInfo = responseBodyStr ? ` [payload: ${responseBodyStr}]` : '';
        console.log(`[${timestamp}] [AppInsight] Tracked : ${req.method} - ${req.path || req.url} - ${resultCode}(${duration}ms)${payloadInfo}`);
      } catch (error) {
        console.error(`[${timestamp}] [AppInsights] ❌ Error tracking request:`, error);
      }
    } else {
      const payloadInfo = responseBodyStr ? ` [payload: ${responseBodyStr}]` : '';
      console.log(`[${timestamp}] [AppInsight] Tracked : ${req.method} - ${req.path || req.url} - ${resultCode}(${duration}ms)${payloadInfo}`);
    }
  });
  next();
});
// --------------------------------------------------------------

// Middleware
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Disable caching for API and auth routes (prevent Azure Front Door caching)
app.use((req: Request, res: Response, next) => {
  // Disable cache for all API and auth routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send('ok');
});

app.get('/api/hello', (req: Request, res: Response) => {
  res.send('hello world');
});

// Auth
app.use('/auth', authRoutes);
app.use('/api/todos', todoRoutes);

// Protected
app.get('/api/protected', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    message: 'This is protected content',
    user: req.user
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
