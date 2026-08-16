/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const devBackendTarget =
    (env.VITE_DEV_BACKEND_URL || '').trim() || 'http://127.0.0.1:3002';

  const proxy: Record<string, ProxyOptions> = {};

  if (mode === 'development') {
    proxy['/api/v3'] = { target: devBackendTarget, changeOrigin: true };
    proxy['/socket.io'] = {
      target: devBackendTarget,
      changeOrigin: true,
      ws: true,
    };
  }

  return {
    base: './',
    plugins: [react(), legacy()],
    server: {
      host: true,
      allowedHosts: ['gerty-ethical-lenita.ngrok-free.dev'],
      proxy,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  };
});
