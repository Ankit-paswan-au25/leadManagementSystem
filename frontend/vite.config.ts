import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Replace process.env.VITE_API_BASE_URL with import.meta.env.VITE_API_BASE_URL at build time
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:3000/api'),
  },
});

