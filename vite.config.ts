import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  return {
    base: isProduction ? '/webtest/' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/.local/**', '**/node_modules/**'],
      },
      proxy: {
        '/n8n-webhook': {
          target: 'https://gpixie.app.n8n.cloud',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/n8n-webhook/, '/webhook/73c8cf09-d134-445b-950a-94a8eccbe4f8'),
        },
      },
    },
  };
});
