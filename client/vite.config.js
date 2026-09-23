import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configure proxy so client API calls seamlessly hit the backend without cross-origin cookie quirks
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
