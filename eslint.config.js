// ============================================================
// eslint.config.js — Strict ESLint configuration (flat config)
// V15.0 — Phase 2 (T-025)
// ============================================================
// Enforces the rules listed in the development plan §9.3.
// Designed to catch the bug classes that caused V15.2 issues:
//   - no-undef would have caught P0-1 (exportQuiz undefined)
//   - no-unused-vars catches dead code
//   - eqeqeq catches subtle coercion bugs
//   - no-implicit-globals catches IIFE leakage
// ============================================================

import js from '@eslint/js';
import browser from 'eslint-plugin-browser';
import prettierConfig from 'eslint-config-prettier';

export default [
  // ── Base: recommended JS rules ──
  js.configs.recommended,

  // ── Browser environment globals (window, document, localStorage, etc.) ──
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        FileReader: 'readonly',
        BroadcastChannel: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        history: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        matchMedia: 'readonly',
        crypto: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        toast: 'readonly',  // app-global
        // Vitest globals (test files only)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
      ecmaVersion: 2022,
      sourceType: 'script',  // IIFE pattern, not ESM yet
    },
  },

  // ── App source files ──
  {
    files: ['src/app/**/*.js'],
    rules: {
      // ── Error-prevention rules (MANDATORY, error level) ──
      'no-undef': 'error',                    // Would have caught P0-1 (exportQuiz)
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-implicit-globals': 'error',         // Catch IIFE leakage
      'no-redeclare': 'error',
      'no-shadow': 'warn',
      'no-use-before-define': ['error', {
        functions: false,    // function hoisting is OK in IIFE pattern
        classes: true,
        variables: true,
      }],

      // ── Code quality (error level) ──
      'eqeqeq': ['error', 'always'],          // Strict equality
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-with': 'error',
      'no-alert': 'off',                       // App uses alert() legitimately
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',

      // ── Style (enforced via Prettier, but a few ESLint-only rules) ──
      'no-var': 'error',                       // Force let/const
      'prefer-const': 'error',
      'no-implicit-coercion': ['error', {
        allow: ['!!'],                          // !!x is OK for boolean coercion
      }],
      'prefer-arrow-callback': 'warn',
      'no-floating-decimal': 'error',          // 0.5 not .5
      'no-multi-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'semi': ['error', 'always'],

      // ── Complexity limits ──
      'complexity': ['warn', 15],              // Warn on functions > 15 branches
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', {
        max: 300,
        skipComments: true,
        skipBlankLines: true,
      }],
      'max-params': ['warn', 5],

      // ── Best practices ──
      'no-extend-native': 'error',
      'no-native-reassign': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'warn',
      'no-multi-assign': 'warn',
      'no-new': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-prototype-builtins': 'warn',
      'no-return-assign': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-unused-labels': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-void': 'error',
      'no-warning-comments': 'off',  // too noisy
      'require-await': 'warn',
      'prefer-promise-reject-errors': 'error',
    },
  },

  // ── Test files (relaxed rules) ──
  {
    files: ['tests/**/*.js', 'tests/**/*.test.js', 'tests/**/*.spec.js'],
    languageOptions: {
      sourceType: 'module',  // Tests use ESM (import/export)
    },
    rules: {
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'complexity': 'off',
    },
  },

  // ── Vendor files (don't lint third-party code) ──
  {
    ignores: [
      'src/vendor/**',
      'src/app/00-icon-library.js',     // Generated icon data
      'src/app/05-audio-assets.js',     // Large base64 data
      'src/app/28-audio-assets-2.js',   // Large base64 data
      'src/app/33-podium-music.js',     // Large base64 data
      'src/app/11-builtin-library.js',  // Large data file
      'dist/**',
      'android/**',
      'node_modules/**',
      'scripts/**',
    ],
  },

  // ── Prettier compatibility (disable conflicting rules) ──
  prettierConfig,
];
