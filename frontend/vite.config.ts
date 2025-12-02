import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep console.log in production for debugging
    // Vite doesn't remove console.log by default, so we don't need special config
    minify: 'esbuild', // Use esbuild (faster) instead of terser
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy auth API requests to backend (but NOT /auth/callback which is a frontend route)
      '/auth/login': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/auth/me': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/auth/logout': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Note: /auth/callback is a frontend route (React Router), not proxied
    },
  },
})
