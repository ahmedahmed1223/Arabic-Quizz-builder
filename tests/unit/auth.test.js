import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const authPath = path.resolve(__dirname, '../../src/app/15-auth-security.js');

describe('Auth & Security (15-auth-security.js)', () => {
  it('file should exist', () => {
    expect(fs.existsSync(authPath)).toBe(true);
  });

  it('should use SHA-256 for password hashing', () => {
    const code = fs.readFileSync(authPath, 'utf-8');
    expect(code).toMatch(/SHA-?256/i);
    expect(code).toContain('crypto.subtle');
  });

  it('should not store plaintext passwords', () => {
    const code = fs.readFileSync(authPath, 'utf-8');
    // Look for hashing pattern
    expect(code).toMatch(/hash|digest|encrypt/i);
  });
});
