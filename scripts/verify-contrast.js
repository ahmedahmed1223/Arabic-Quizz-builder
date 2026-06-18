// Verify WCAG contrast fix is applied per-theme
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const THEMES_TO_TEST = ['space', 'light', 'warm-rose', 'pure-black', 'dark-teal'];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('quiz_v4_setup_done', '1');
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  for (const themeId of THEMES_TO_TEST) {
    await page.evaluate((t) => applyTheme(t, false), themeId);
    await page.waitForTimeout(200);
    const computed = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        textMuted: cs.getPropertyValue('--text-muted').trim(),
        textSecondary: cs.getPropertyValue('--text-secondary').trim(),
        bgDeep: cs.getPropertyValue('--bg-deep').trim(),
        bgCard: cs.getPropertyValue('--bg-card').trim(),
      };
    });
    console.log(`${themeId.padEnd(12)} muted=${computed.textMuted.padEnd(8)}  sec=${computed.textSecondary.padEnd(8)}  bg-deep=${computed.bgDeep}`);
  }
  
  await browser.close();
})();
