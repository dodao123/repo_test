// API Configuration
// In development, use relative URLs (proxied by Vite)
// In production, use full URL from env
export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? '' : 'http://localhost:3000');

