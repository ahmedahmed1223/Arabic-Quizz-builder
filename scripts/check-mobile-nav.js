// Specifically check bottom-nav visibility on admin view at mobile width
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz'));
    keys.forEach(k => localStorage.removeItem(k));
  });
  const page = await ctx.newPage();
  
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { Wizard.setLang('ar'); Wizard.setSetupMode('quick'); Wizard.selectMode('turns'); });
  for (let i = 0; i < 4; i++) { await page.evaluate(() => Wizard.next()); await wait(300); }
  await page.evaluate(() => {
    const p = document.getElementById('wiz-password'), p2 = document.getElementById('wiz-password2');
    if (p) p.value = '1234'; if (p2) p2.value = '1234';
    try { Wizard.data.password = '1234'; } catch(e){}
  });
  await page.evaluate(() => Wizard.finish());
  await wait(2500);
  await page.click('[onclick="showLoginPassword()"]'); await wait(500);
  await page.fill('#login-password-input', '1234');
  await page.click('[onclick="doLogin()"]'); await wait(2000);
  
  // Now on admin view
  console.log('Current view:', await page.evaluate(() => window._currentView));
  
  // Check bottom-nav
  const navInfo = await page.evaluate(() => {
    const bn = document.getElementById('bottom-nav');
    const an = document.querySelector('.admin-nav');
    return {
      currentView: window._currentView,
      bottomNav: bn ? {
        exists: true,
        display: getComputedStyle(bn).display,
        offsetParent: bn.offsetParent !== null,
        hasNavVisibleClass: bn.classList.contains('nav-visible'),
        rect: bn.getBoundingClientRect(),
      } : { exists: false },
      adminNav: an ? {
        exists: true,
        display: getComputedStyle(an).display,
        offsetParent: an.offsetParent !== null,
        rect: an.getBoundingClientRect(),
      } : { exists: false },
      viewportWidth: window.innerWidth,
    };
  });
  console.log(JSON.stringify(navInfo, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: '/home/z/my-project/screenshots/mobile-admin-nav-check.png' });
  
  // List visible nav buttons
  const navButtons = await page.evaluate(() => {
    const buttons = [];
    // bottom-nav items
    document.querySelectorAll('.bottom-nav-item').forEach(b => {
      const r = b.getBoundingClientRect();
      buttons.push({
        type: 'bottom-nav',
        text: b.textContent.trim().slice(0, 20),
        visible: r.width > 0 && r.height > 0,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) },
      });
    });
    // nav-tab items
    document.querySelectorAll('.nav-tab').forEach(b => {
      const r = b.getBoundingClientRect();
      buttons.push({
        type: 'nav-tab',
        text: b.textContent.trim().slice(0, 20),
        visible: r.width > 0 && r.height > 0,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) },
      });
    });
    return buttons;
  });
  console.log('\n=== Nav buttons ===');
  navButtons.forEach(b => {
    if (b.visible) console.log(`  ✓ ${b.type}: "${b.text}" @ (${b.rect.x},${b.rect.y}) w=${b.rect.w}`);
  });
  
  await browser.close();
})();
