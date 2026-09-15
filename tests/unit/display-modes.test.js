import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve(__dirname, '../../src/app/20-display-modes.js');

describe('Display Modes (20-display-modes.js)', () => {
  it('file should exist and define display modes', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const code = fs.readFileSync(filePath, 'utf-8');
    expect(code).toContain('renderCatsGrid');
    expect(code).toContain('renderCatsList');
    expect(code).toContain('renderCatsHidden');
  });

  it('should support all 5 display modes', () => {
    const code = fs.readFileSync(filePath, 'utf-8');
    const modes = ['grid', 'list', 'hidden', 'jeopardy', 'wheel'];
    modes.forEach(mode => {
      // Each mode should have a render function or handler
      const hasMode = code.includes(mode);
      expect(hasMode).toBe(true);
    });
  });
});
