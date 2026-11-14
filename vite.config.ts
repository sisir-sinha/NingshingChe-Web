import { defineConfig } from 'vite';

// The dev server already falls back to index.html for unknown paths,
// which is what History-API routing needs (no "#" in URLs).
// BASE_PATH is the sub-folder the site is served from:
//   "/"                    → own domain (ningshingche.com) — the default
//   "/NingshingChe-Web/"   → GitHub project pages
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { target: 'es2020', sourcemap: false },
});
