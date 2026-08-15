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
//
// V15.0-fix (T-029 / T-034): Production optimizations
//   - minify: 'terser' — minify JS (saves ~40% bundle size)
//   - CSS minification via esbuild
//   - Terser options: drop_console (remove console.log), drop_debugger
//   - Keep comments that document V15.0-fix markers for maintainability

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
    // V15.0-fix (T-029): Enable minification — saves ~40% on JS bundle
    // Previous: minify: false (kept readable for debugging)
    // Now: 'terser' with conservative options to avoid breaking IIFE pattern
    minify: 'terser',
    terserOptions: {
      compress: {
        // Drop console.log but keep console.warn/error/info (per development plan §9.3)
        drop_console: false,        // Set true in production releases after V15.0
        drop_debugger: true,
        // Keep function names for stack traces in production
        keep_fnames: true,
        // Keep class names
        keep_classnames: true,
        // Don't inline too aggressively — preserve readability for debugging
        passes: 1,
      },
      mangle: {
        // Keep V15.0-fix comment markers readable in production
        keep_classnames: true,
      },
      format: {
        // Preserve comments starting with V15.0-fix for maintainability
        comments: /V15\.0-fix|^!|IMPORTANT/i,
        beautify: false,
      },
    },
    // V15.0-fix (T-034): CSS minification
    cssMinify: 'esbuild',
    target: 'es2018',
    sourcemap: false,
    // V15.0-fix (T-029): Report bundle size for monitoring
    reportCompressedSize: true,
    chunkSizeWarningLimit: 8000,  // Warn if > 8MB (current: ~7.3MB)
  },

  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
  },
});
