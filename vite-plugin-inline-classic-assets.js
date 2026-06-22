// vite-plugin-inline-classic-assets.js
// Custom Vite plugin that produces a single self-contained HTML file by:
//   1. Inlining every <script src="/src/..."> (classic, non-module) tag as an
//      inline <script> block — preserving the original app's shared-global-scope
//      IIFE pattern across files.
//   2. Inlining every <link rel="stylesheet" href="/src/..."> tag as an inline
//      <style> block.
//   3. Replacing the <!-- __BODY_MARKER__ --> placeholder with the contents of
//      src/templates/body.html (the original app's body markup).
//
// In dev mode, none of this happens — Vite serves each file separately so HMR
// and source maps work normally.
//
// CRITICAL: This plugin runs with order: 'pre' so that it inlines /src/...
// references BEFORE Vite's own HTML processor tries to bundle them as CSS/JS
// entry points. Otherwise Vite would convert <link href="/src/..."> into
// <link href="/assets/style.css"> and emit a separate CSS file.
//
// Scripts containing binary control characters (e.g. XLSX codepage tables,
// jsPDF font data) cannot be inlined directly because parse5 (Vite's HTML
// parser) rejects control-character-in-input-stream. For those files, we
// base64-encode the source and decode+eval at runtime. The original CSP allows
// 'unsafe-eval', so this is permitted.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(__dirname);

function readSrc(ref) {
  if (!ref.startsWith('/src/')) return null;
  const filePath = resolve(PROJECT_ROOT, '.' + ref);
  if (!existsSync(filePath)) {
    console.warn(`[inline-classic-assets] file not found: ${filePath}`);
    return null;
  }
  return readFileSync(filePath, 'utf-8');
}

function readSrcRaw(ref) {
  if (!ref.startsWith('/src/')) return null;
  const filePath = resolve(PROJECT_ROOT, '.' + ref);
  if (!existsSync(filePath)) {
    console.warn(`[inline-classic-assets] file not found: ${filePath}`);
    return null;
  }
  return readFileSync(filePath);  // Buffer
}

function readBodyTemplate() {
  const bodyPath = resolve(PROJECT_ROOT, 'src/templates/body.html');
  if (!existsSync(bodyPath)) {
    console.warn(`[inline-classic-assets] body template not found: ${bodyPath}`);
    return '';
  }
  return readFileSync(bodyPath, 'utf-8');
}

function hasControlChars(buf) {
  // Returns true if the buffer contains any control chars other than
  // tab (9), LF (10), CR (13).
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 32 && b !== 9 && b !== 10 && b !== 13) return true;
  }
  return false;
}

function inlineScript(src, content) {
  // If the content has control chars, base64-encode and eval at runtime.
  const buf = Buffer.from(content, 'utf-8');
  if (hasControlChars(buf)) {
    const b64 = buf.toString('base64');
    console.log(`  ✓ inline script (base64): ${src} (${b64.length} b64 chars)`);
    return `<script>\n/* === ${src} (base64-encoded — source contains control chars) === */\n(function(){try{eval(atob(${JSON.stringify(b64)}));}catch(e){console.error('[inline-classic-assets] Failed to eval ${src}:',e);throw e;}})();\n</script>`;
  }
  console.log(`  ✓ inline script: ${src}`);
  return `<script>\n/* === ${src} === */\n${content}\n</script>`;
}

export function inlineClassicAssets() {
  return {
    name: 'inline-classic-assets',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const isBuild = !ctx || !ctx.server;
        
        // 3. Always Replace body marker (even in DEV)
        const bodyContent = readBodyTemplate();
        if (bodyContent) {
          const cleaned = bodyContent
            .replace(/^\s*<body>\s*/, '')
            .replace(/\s*<\/body>\s*$/, '');
          html = html.replace('<!-- __BODY_MARKER__ -->', cleaned);
          console.log('  ✓ injected body template (dev/build)');
        }

        if (!isBuild) {
          return html;
        }

        console.log('[inline-classic-assets] Inlining classic scripts and stylesheets (pre-build)...');

        let inlinedScripts = 0;
        let inlinedStyles = 0;

        // 1. Inline <script src="/src/..."></script>
        html = html.replace(
          /<script\s+src="(\/src\/[^"]+)"\s*>\s*<\/script>/g,
          (match, src) => {
            const content = readSrc(src);
            if (content === null) return match;
            inlinedScripts++;
            return inlineScript(src, content);
          }
        );

        // 2. Inline <link rel="stylesheet" href="/src/...">
        html = html.replace(
          /<link\s+rel="stylesheet"\s+href="(\/src\/[^"]+)"\s*>/g,
          (match, href) => {
            const content = readSrc(href);
            if (content === null) return match;
            inlinedStyles++;
            console.log(`  ✓ inline style:  ${href}`);
            return `<style>\n/* === ${href} === */\n${content}\n</style>`;
          }
        );
        html = html.replace(
          /<link\s+href="(\/src\/[^"]+)"\s+rel="stylesheet"\s*>/g,
          (match, href) => {
            const content = readSrc(href);
            if (content === null) return match;
            inlinedStyles++;
            console.log(`  ✓ inline style:  ${href}`);
            return `<style>\n/* === ${href} === */\n${content}\n</style>`;
          }
        );

        // Body marker replacement moved above to run in both dev and build

        console.log(`[inline-classic-assets] Done. Inlined ${inlinedScripts} scripts, ${inlinedStyles} styles.`);
        return html;
      },
    },
  };
}
