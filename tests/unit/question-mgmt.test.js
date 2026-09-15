import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const filePath = path.resolve(__dirname, '../../src/app/08-question-mgmt.js');

describe('Question Management (08-question-mgmt.js)', () => {
  it('file should exist and define key functions', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const code = fs.readFileSync(filePath, 'utf-8');
    expect(code).toContain('saveQuestion');
    expect(code).toContain('deleteQuestion');
    expect(code).toContain('duplicateQuestion');
    expect(code).toContain('generateMultipleQuestions');
  });

  it('should have QuizAdmin namespace', () => {
    const code = fs.readFileSync(filePath, 'utf-8');
    expect(code).toContain('QuizAdmin');
    expect(code).toContain('renderStatsGrid');
    expect(code).toContain('renderCategoriesAdmin');
    expect(code).toContain('selectCatAdmin');
  });
});
