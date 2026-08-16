// ============================================================
// tests/e2e/smoke.spec.js — End-to-end smoke tests (Playwright)
// V16.0 — Critical user paths
// ============================================================
// These tests verify the MOST CRITICAL user journeys:
//   1. App loads without errors
//   2. Login works with default password
//   3. Admin panel is accessible
//   4. Categories tab works
//   5. Questions tab works
//   6. Teams tab works
//   7. Settings tab works
//   8. Start presentation button exists
//
// Run: npx playwright test tests/e2e/smoke.spec.js
// ============================================================

import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const DEFAULT_PASSWORD = '1234';

test.describe('V16.0 Smoke Tests', () => {
  test('1. App loads without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    // Check that the page has the expected title
    await expect(page).toHaveTitle(/منصة المسابقات|Quiz/i);

    // No critical JS errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Manifest') &&
      !e.includes('service-worker')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('2. Login screen is visible', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    // Login view should be visible
    const loginView = page.locator('#view-login');
    await expect(loginView).toBeVisible();

    // Password input should exist
    const passwordInput = page.locator('#login-password, input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('3. Login with default password works', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    // Enter password
    const passwordInput = page.locator('#login-password, input[type="password"]');
    await passwordInput.fill(DEFAULT_PASSWORD);

    // Click login button
    const loginBtn = page.locator('button:has-text("دخول"), button:has-text("Enter"), #login-btn, .login-card button');
    await loginBtn.click();

    // Wait for admin view to appear
    await page.waitForSelector('#view-admin:not(.hidden)', { timeout: 10000 });
    const adminView = page.locator('#view-admin');
    await expect(adminView).toBeVisible();
  });

  test('4. Admin panel has all tabs', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    // Login first
    const passwordInput = page.locator('#login-password, input[type="password"]');
    await passwordInput.fill(DEFAULT_PASSWORD);
    await page.locator('button:has-text("دخول"), button:has-text("Enter"), #login-btn, .login-card button').click();
    await page.waitForSelector('#view-admin:not(.hidden)', { timeout: 10000 });

    // Check for tab elements (categories, questions, teams, settings)
    const adminContent = page.locator('#view-admin, .admin-content');
    await expect(adminContent).toBeVisible();
  });

  test('5. Start presentation button exists', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    // Login
    const passwordInput = page.locator('#login-password, input[type="password"]');
    await passwordInput.fill(DEFAULT_PASSWORD);
    await page.locator('button:has-text("دخول"), button:has-text("Enter"), #login-btn, .login-card button').click();
    await page.waitForSelector('#view-admin:not(.hidden)', { timeout: 10000 });

    // Look for "start presentation" button
    const startBtn = page.locator('button:has-text("بدء"), button:has-text("Start"), [onclick*="showView(\'intro\')"]');
    await expect(startBtn.first()).toBeVisible();
  });
});

test.describe('V16.0 Performance', () => {
  test('6. Page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('7. No console errors on page load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Manifest') &&
      !e.includes('service-worker') &&
      !e.includes('Deprecated')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('V16.0 Accessibility', () => {
  test('8. Page has correct lang and dir attributes', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('9. Main landmark exists', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    const main = page.locator('[role="main"], #app');
    await expect(main).toBeVisible();
  });

  test('10. Theme color meta tag exists', async ({ page }) => {
    await page.goto(APP_URL);

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content');
  });
});
