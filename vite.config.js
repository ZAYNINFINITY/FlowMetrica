import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API is a separate Express process. Vite only proxies /api during development;
// in production Express serves dist/ directly, so there is one origin and no CORS config.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
