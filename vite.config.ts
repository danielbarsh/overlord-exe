import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative asset paths so the build works under any sub-path (e.g. https://<user>.github.io/<repo>/)
  base: './',
  server: { port: 5173 },
});
