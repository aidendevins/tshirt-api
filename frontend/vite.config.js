import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        // Proxy API calls to backend server
        '/api': env.VITE_API_BASE_URL || 'http://localhost:8000',
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});


