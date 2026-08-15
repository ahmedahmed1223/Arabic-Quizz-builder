// ============================================================
// vitest.config.js — Vitest configuration for Arabic Quiz Builder
// V15.0 — Phase 2 (T-023)
// ============================================================
// Vitest is chosen over Jest because:
//  1. Native ESM support (the codebase is migrating to ESM in Phase 2)
//  2. Vite-powered — shares config with the existing vite.config.js
//  3. Faster cold start (~100ms vs Jest ~1s)
//  4. Built-in coverage via c8 (no extra jest --coverage config)
//  5. Compatible API: describe/it/expect work identically
// ============================================================

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // Reuse the existing Vite config where possible
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'src/app'),
      '@vendor': resolve(__dirname, 'src/vendor'),
    },
  },
  test: {
    // Test file patterns — co-located with source or in tests/
    include: [
      'tests/unit/**/*.test.js',
      'tests/unit/**/*.spec.js',
      'src/app/**/*.test.js',
      'src/app/**/*.spec.js',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'android/**',
      'scripts/**',
      '**/*.config.js',
      '**/*.config.cjs',
    ],
    // Environment: jsdom for DOM-dependent code (the app is browser-based)
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // Pretend to be a modern browser
        pretendToBeVisual: true,
        url: 'http://localhost:5173/',
      },
    },
    // Globals: allow describe/it/expect without imports (Jest compat)
    globals: true,
    // Setup files — run before each test file
    setupFiles: [
      'tests/unit/setup.js',
    ],
    // Coverage via c8
    coverage: {
      provider: 'c8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: 'tests/coverage',
      // Critical modules must have ≥70% coverage (per development plan)
      // Other modules ≥50%
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
      include: [
        'src/app/01-foundation.js',
        'src/app/02-storage.js',
        'src/app/04-i18n.js',
        'src/app/06-compression.js',
        'src/app/07-state-mgmt.js',
        'src/app/08-question-mgmt.js',
        'src/app/09-team-mgmt.js',
        'src/app/10-category-mgmt.js',
        'src/app/11-play-logic.js',
        'src/app/12-timer.js',
        'src/app/13-scoring.js',
        'src/app/15-auth-security.js',
        'src/app/16-encryption.js',
      ],
      exclude: [
        'src/vendor/**',
        'src/app/00-icon-library.js',
        'src/app/05-audio-assets.js',
        'src/app/28-audio-assets-2.js',
        'src/app/33-podium-music.js',
      ],
    },
    // Performance: run tests in parallel by default
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
    // Reporting
    reporters: ['default', 'junit'],
    outputFile: 'tests/results/junit.xml',
    // Watch mode (dev only)
    watch: false,
  },
});
