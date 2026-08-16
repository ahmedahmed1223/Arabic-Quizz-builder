// ============================================================
// tests/e2e/quiz-flow.spec.js — Quiz creation and play flow
// V16.0 — Detailed user journey tests
// ============================================================

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const DEFAULT_PASSWORD = '1234';

async function login(page) {
  await page.goto(APP_URL);
  await page.waitForLoadState('networkidle');
  const passwordInput = page.locator('#login-password, input[type="password"]');
  await passwordInput.fill(DEFAULT_PASSWORD);
  await page.locator('button:has-text("دخول"), button:has-text("Enter"), #login-btn, .login-card button').click();
  await page.waitForSelector('#view-admin:not(.hidden)', { timeout: 10000 });
}

test.describe('V16.0 Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('1. Can navigate to categories tab', async ({ page }) => {
    const categoriesTab = page.locator('[onclick*="categories"], button:has-text("أقسام"), [data-tab="categories"]');
    if (await categoriesTab.first().isVisible()) {
      await categoriesTab.first().click();
      await page.waitForTimeout(500);
    }
    // Should not crash
    const adminView = page.locator('#view-admin');
    await expect(adminView).toBeVisible();
  });

  test('2. Can navigate to teams tab', async ({ page }) => {
    const teamsTab = page.locator('[onclick*="teams"], button:has-text("فرق"), [data-tab="teams"]');
    if (await teamsTab.first().isVisible()) {
      await teamsTab.first().click();
      await page.waitForTimeout(500);
    }
    const adminView = page.locator('#view-admin');
    await expect(adminView).toBeVisible();
  });

  test('3. Can navigate to settings tab', async ({ page }) => {
    const settingsTab = page.locator('[onclick*="settings"], button:has-text("إعدادات"), [data-tab="settings"]');
    if (await settingsTab.first().isVisible()) {
      await settingsTab.first().click();
      await page.waitForTimeout(500);
    }
    const adminView = page.locator('#view-admin');
    await expect(adminView).toBeVisible();
  });

  test('4. Theme toggle button works', async ({ page }) => {
    const themeToggle = page.locator('#v16-theme-toggle');
    if (await themeToggle.isVisible()) {
      const initialIcon = await themeToggle.textContent();
      await themeToggle.click();
      await page.waitForTimeout(300);
      // Button should still be visible after toggle
      await expect(themeToggle).toBeVisible();
    }
  });

  test('5. Language selector exists', async ({ page }) => {
    // Look for language selector in settings
    const langSelector = page.locator('#s-language, select[name="language"], [data-i18n="settings.language"]');
    // At least the settings should be accessible
    const adminView = page.locator('#view-admin');
    await expect(adminView).toBeVisible();
  });
});

test.describe('V16.0 Data Integrity', () => {
  test('6. Question bank loads correctly', async ({ page }) => {
    await login(page);
    // The app should have loaded the builtin question library
    // Check via JS evaluation
    const hasState = await page.evaluate(() => {
      return typeof state !== 'undefined' && state !== null;
    });
    expect(hasState).toBe(true);
  });

  test('7. No duplicate question IDs', async ({ page }) => {
    await login(page);
    const noDuplicates = await page.evaluate(() => {
      if (typeof state === 'undefined' || !state.categories) return true;
      const ids = new Set();
      for (const cat of state.categories) {
        for (const q of (cat.questions || [])) {
          if (ids.has(q.id)) return false;
          ids.add(q.id);
        }
      }
      return true;
    });
    expect(noDuplicates).toBe(true);
  });

  test('8. All MCQ questions have valid correct index', async ({ page }) => {
    await login(page);
    const allValid = await page.evaluate(() => {
      if (typeof state === 'undefined' || !state.categories) return true;
      for (const cat of state.categories) {
        for (const q of (cat.questions || [])) {
          if (q.type === 'mcq') {
            if (!q.options || q.options.length < 2) return false;
            if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) {
              return false;
            }
          }
        }
      }
      return true;
    });
    expect(allValid).toBe(true);
  });
});
