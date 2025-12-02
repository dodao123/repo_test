import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('%c[Frontend] main.tsx: App starting...', 'color: blue; font-weight: bold');
console.log('%c[Frontend] Version: v10', 'color: green; font-weight: bold; font-size: 16px');
console.log('[Frontend] Build time:', '2025-12-01T07:30:00Z');
console.log('[Frontend] Current URL:', window.location.href);
console.log('[Frontend] React Router and AuthContext should initialize now');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
