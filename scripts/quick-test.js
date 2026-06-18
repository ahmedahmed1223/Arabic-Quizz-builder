// Quick test: just open the page and screenshot.
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

(async () => {
  console.log('1. launching browser');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  console.log('2. browser launched');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  
  const errors = [];
  page.on('console', m => errors.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  console.log('3. navigating');
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('4. navigated, waiting 3s');
  await page.waitForTimeout(3000);
  console.log('5. screenshotting');
  await page.screenshot({ path: '/home/z/my-project/screenshots/test-welcome.png' });
  console.log('6. done, errors:');
  errors.slice(0, 30).forEach(e => console.log('   ' + e));
  await browser.close();
  console.log('7. browser closed');
})();
