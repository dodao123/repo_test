import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import authRoutes from './auth/routes.js';
import { authenticateToken, AuthRequest } from './auth/middleware.js';

const app = express();
const port = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const sessionSecret = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

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
    secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).send('ok');
});

// Public routes
app.get('/api/hello', (req: Request, res: Response) => {
    res.send('hello world');
});

// Auth routes
app.use('/auth', authRoutes);

// Protected route example
app.get('/api/protected', authenticateToken, (req: AuthRequest, res: Response) => {
    res.json({ 
        message: 'This is protected content',
        user: req.user 
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
