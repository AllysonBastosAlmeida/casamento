import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { microsoftFormsProxy } from './server/microsoftFormsProxy.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const repository = env.VITE_REPOSITORY_NAME?.replace(/^\/+|\/+$/g, '');
  return {
    plugins: [react(), microsoftFormsProxy()],
    base: repository ? `/${repository}/` : '/',
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
