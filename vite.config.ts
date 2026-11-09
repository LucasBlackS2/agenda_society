import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O proxy encaminha /api para o Spring Boot em localhost:8080
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
