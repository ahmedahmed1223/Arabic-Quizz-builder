// vite.config.js
// Vite configuration for the modular quiz-platform project.
//
// Development (`npm run dev`):
//   - Vite serves index.html and all /src/... assets over HTTP.
//   - Classic <script src="/src/..."> tags load each file separately (good for
//     debugging — you see the original file paths in DevTools).
//
// Production (`npm run build`):
//   - The inline-classic-assets plugin inlines EVERY <script src="/src/...">,
//     <link rel="stylesheet" href="/src/...">, and the body template marker
//     directly into index.html.
//   - The final dist/index.html is a single self-contained file that works
//     offline (matches the original single-file distribution).

import { defineConfig } from 'vite';
import { inlineClassicAssets } from './vite-plugin-inline-classic-assets.js';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, '.'),
  publicDir: 'public',

  plugins: [
    inlineClassicAssets(),
  ],

  build: {
    outDir: 'dist',
    // Keep the output filename predictable.
    emptyOutDir: true,
    // Disable code splitting — we want a single file.
    cssCodeSplit: false,
    // Inline all assets regardless of size.
    assetsInlineLimit: 100000000,
    modulePreload: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    minify: false, // Keep readable — original app is already minified where it matters
    target: 'es2018',
    sourcemap: false,
  },

  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
});
