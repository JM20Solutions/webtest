import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/webtest/',
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
      hmr: process.env.DISABLE_HMR !== 'true',
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
