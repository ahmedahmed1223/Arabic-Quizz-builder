#!/usr/bin/env node
// V16-008: Find missing i18n keys referenced in code but not defined in dictionaries
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'app');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));

const referencedKeys = new Set();
const definedKeys = { ar: new Set(), en: new Set() };

// Scan all files for I18n.t('key') calls
files.forEach(file => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
  const matches = content.matchAll(/I18n\.t\(['"`]([^'"`]+)['"`]\)/g);
  for (const match of matches) {
    referencedKeys.add(match[1]);
  }
});

// Try to load i18n dictionary (simplified — just scan 04-i18n.js)
const i18nContent = fs.readFileSync(path.join(srcDir, '04-i18n.js'), 'utf-8');
const arMatches = i18nContent.matchAll(/['"`]([^'"`]+)['"`]\s*:\s*['"`]/g);
for (const m of arMatches) definedKeys.ar.add(m[1]);

// Find missing
const missing = [...referencedKeys].filter(k => !definedKeys.ar.has(k));

console.log(`Referenced keys: ${referencedKeys.size}`);
console.log(`Defined keys (ar): ${definedKeys.ar.size}`);
console.log(`Missing keys: ${missing.length}`);
if (missing.length > 0) {
  console.log('\nMissing keys:');
  missing.slice(0, 30).forEach(k => console.log(`  - ${k}`));
  if (missing.length > 30) console.log(`  ... and ${missing.length - 30} more`);
}
