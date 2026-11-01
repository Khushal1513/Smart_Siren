import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from 'tailwindcss'; // Corrected this import
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),  // This sets up the `@` alias for the `src` folder
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss, // Correct plugin for Tailwind CSS
        autoprefixer,
      ]
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
