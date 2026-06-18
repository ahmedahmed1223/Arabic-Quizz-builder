// scripts/check_syntax.mjs
// Use Node.js to actually parse each JS file and report syntax errors.
// This is more reliable than counting braces.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const dirs = ['src/app', 'src/vendor'];
let totalErrors = 0;

for (const dir of dirs) {
  const fullDir = join(ROOT, dir);
  const files = readdirSync(fullDir).filter(f => f.endsWith('.js')).sort();
  for (const f of files) {
    const path = join(fullDir, f);
    const code = readFileSync(path, 'utf-8');
    try {
      // Wrap in a function to check syntax without executing
      new Function(code);
      console.log(`  ✓ ${dir}/${f}`);
    } catch (e) {
      // Try to extract line number from the error
      const match = e.stack.match(/<anonymous>:(\d+):(\d+)/);
      const lineInfo = match ? ` (line ${match[1]}:${match[2]})` : '';
      console.log(`  ✗ ${dir}/${f}: ${e.message}${lineInfo}`);
      totalErrors++;
    }
  }
}

console.log(`\n${totalErrors === 0 ? '✓ All files parse cleanly.' : `✗ ${totalErrors} files have syntax errors.`}`);
process.exit(totalErrors === 0 ? 0 : 1);
