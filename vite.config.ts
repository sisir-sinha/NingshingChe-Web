import { defineConfig } from 'vite';

// The dev server already falls back to index.html for unknown paths,
// which is what History-API routing needs (no "#" in URLs).
export default defineConfig({
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { target: 'es2020', sourcemap: false },
});
