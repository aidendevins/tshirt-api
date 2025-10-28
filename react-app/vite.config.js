import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy API calls if we later need them in React; current creator uses iframe
      '/api': 'http://localhost:3000',
    },
  },
});


