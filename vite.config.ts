import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    // Always use HTTP - no HTTPS
    https: false,
    port: 5173, // Use Vite's default port
    host: '0.0.0.0', // Bind to all network interfaces
    strictPort: false, // Allow port switching if needed
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