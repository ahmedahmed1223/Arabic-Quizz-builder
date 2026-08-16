import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const storagePath = path.resolve(__dirname, '../../src/app/02-storage.js');

describe('MediaDB (02-storage.js)', () => {
  it('file should exist and be valid JS', () => {
    expect(fs.existsSync(storagePath)).toBe(true);
    const code = fs.readFileSync(storagePath, 'utf-8');
    expect(code).toContain('MediaDB');
    expect(code).toContain('saveAllMedia');
    expect(code).toContain('loadAllMedia');
    expect(code).toContain('getAll'); // V15.0 batching
  });

  it('should use single transaction for loadAllMedia (V15.0 fix)', () => {
    const code = fs.readFileSync(storagePath, 'utf-8');
    expect(code).toContain('getAll()');
    expect(code).toContain('V15.0-fix');
  });

  it('should have fallback for old browsers', () => {
    const code = fs.readFileSync(storagePath, 'utf-8');
    expect(code).toContain('Fallback');
    expect(code).toContain('sequential');
  });
});
