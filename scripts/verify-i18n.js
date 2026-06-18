// Verify i18n switching works correctly by checking actual text in admin nav tabs.
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('quiz_v4_setup_done', '1');
    try { localStorage.setItem('quiz_v4_intro_seen', '1'); } catch {}
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Login flow
  await page.click('[onclick="showLoginPassword()"]').catch(()=>{});
  await page.waitForTimeout(700);
  await page.fill('#login-password-input', '1234').catch(()=>{});
  await page.click('[onclick="doLogin()"]').catch(()=>{});
  await page.waitForTimeout(1500);

  // Get Arabic text of nav tabs
  const arText = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.nav-tab');
    return [...tabs].map(t => ({
      txt: t.textContent.trim().slice(0, 40),
      aria: t.getAttribute('aria-controls'),
    }));
  });
  console.log('=== Arabic nav tabs ===');
  arText.forEach(t => console.log(`  ${t.aria}: "${t.txt}"`));

  // Switch to English
  await page.evaluate(() => { if (typeof I18n !== 'undefined') I18n.setLang('en'); });
  await page.waitForTimeout(800);

  // Get English text of nav tabs
  const enText = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.nav-tab');
    return [...tabs].map(t => ({
      txt: t.textContent.trim().slice(0, 40),
      aria: t.getAttribute('aria-controls'),
    }));
  });
  console.log('\n=== English nav tabs ===');
  enText.forEach(t => console.log(`  ${t.aria}: "${t.txt}"`));

  // Check html dir
  const dir = await page.evaluate(() => document.documentElement.dir);
  const lang = await page.evaluate(() => document.documentElement.lang);
  console.log(`\n=== Document state ===\n  lang="${lang}" dir="${dir}"`);

  await browser.close();
})();
