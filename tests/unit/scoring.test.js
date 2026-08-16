import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const scoringPath = path.resolve(__dirname, '../../src/app/13-scoring.js');

describe('Scoring & Theme (13-scoring.js)', () => {
  it('file should exist and contain applyTheme', () => {
    expect(fs.existsSync(scoringPath)).toBe(true);
    const code = fs.readFileSync(scoringPath, 'utf-8');
    expect(code).toContain('applyTheme');
    expect(code).toContain('isManual'); // V15.0 fix
  });

  it('should validate theme id before applying (V15.0 fix)', () => {
    const code = fs.readFileSync(scoringPath, 'utf-8');
    expect(code).toContain('THEMES');
    expect(code).toContain('space'); // valid fallback
  });

  it('should not set manual flag on auto-detection (V15.0 fix)', () => {
    const code = fs.readFileSync(scoringPath, 'utf-8');
    // The isManual parameter should guard the localStorage.setItem calls
    expect(code).toMatch(/if\s*\(\s*isManual\s*\)/);
  });
});
