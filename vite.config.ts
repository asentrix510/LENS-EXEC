import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    // Use HTTPS for full functionality, HTTP for basic testing
    https: process.env.VITE_USE_HTTP ? false : {},
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'tesseract.js'],
  },
  define: {
    // Provide default values for environment variables
    'import.meta.env.VITE_DEBUG_MODE': JSON.stringify(process.env.NODE_ENV === 'development' ? 'true' : 'false'),
  },
});