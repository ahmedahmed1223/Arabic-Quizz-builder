import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve(__dirname, '../../src/app/18-presentation.js');

describe('Presentation (18-presentation.js)', () => {
  it('file should exist and define presentation functions', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const code = fs.readFileSync(filePath, 'utf-8');
    expect(code).toContain('toggleFullscreen');
    expect(code).toContain('exportData');
    expect(code).toContain('importJSON');
  });

  it('should have export/import functions', () => {
    const code = fs.readFileSync(filePath, 'utf-8');
    expect(code).toContain('exportData');
    expect(code).toContain('importJSON');
    expect(code).toContain('exportEncrypted');
  });
});
