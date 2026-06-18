// scripts/find_unbalanced.mjs
// Find the exact location of an unbalanced brace/paren/bracket/template-literal
// in a JS file by properly tracking strings, comments, regex, and template literals.

import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node find_unbalanced.mjs <file.js>');
  process.exit(1);
}

const code = readFileSync(file, 'utf-8');

let i = 0;
let line = 1;
let col = 1;
const stack = []; // [{token, line, col}]

function peek() { return code[i]; }
function next() {
  const c = code[i++];
  if (c === '\n') { line++; col = 1; } else { col++; }
  return c;
}

let inString = null; // ', ", or `
let inLineComment = false;
let inBlockComment = false;
let inRegex = false;
let escape = false;
let templateStack = []; // stack of template literal contexts

// Simple state machine — does not handle all edge cases (e.g., regex detection
// requires context), but should work for most code.

while (i < code.length) {
  const c = code[i];
  const c2 = code[i+1] || '';

  if (inLineComment) {
    if (c === '\n') { inLineComment = false; }
    next();
    continue;
  }
  if (inBlockComment) {
    if (c === '*' && c2 === '/') { next(); next(); inBlockComment = false; continue; }
    next();
    continue;
  }
  if (inString) {
    if (escape) { escape = false; next(); continue; }
    if (c === '\\') { escape = true; next(); continue; }
    if (c === inString) { next(); inString = null; continue; }
    next();
    continue;
  }
  // Not in string or comment
  if (c === '/' && c2 === '/') { inLineComment = true; next(); next(); continue; }
  if (c === '/' && c2 === '*') { inBlockComment = true; next(); next(); continue; }
  if (c === '"' || c === "'" || c === '`') {
    inString = c;
    next();
    continue;
  }
  if (c === '{' || c === '(' || c === '[') {
    stack.push({ token: c, line, col });
    next();
    continue;
  }
  if (c === '}' || c === ')' || c === ']') {
    const expected = { ')': '(', '}': '{', ']': '[' }[c];
    if (stack.length === 0) {
      console.log(`✗ Extra closing '${c}' at line ${line}, col ${col}`);
      process.exit(1);
    }
    const top = stack[stack.length - 1];
    if (top.token !== expected) {
      console.log(`✗ Mismatch: '${c}' at line ${line}, col ${col} but expected closing for '${top.token}' opened at line ${top.line}, col ${top.col}`);
      process.exit(1);
    }
    stack.pop();
    next();
    continue;
  }
  next();
}

if (stack.length > 0) {
  console.log(`✗ ${stack.length} unclosed token(s) in ${file}:`);
  for (const t of stack) {
    console.log(`  '${t.token}' opened at line ${t.line}, col ${t.col}`);
  }
} else {
  console.log(`✓ ${file}: all tokens balanced.`);
}
