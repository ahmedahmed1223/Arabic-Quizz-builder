// Mobile-specific flow test with fresh context per viewport
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setupAndLogin(browser, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz'));
    keys.forEach(k => localStorage.removeItem(k));
  });
  const page = await ctx.newPage();
  
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  
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
  
  // Add teams
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    saveState();
  });
  await wait(1000);
  
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  
  // ══ MOBILE 390px ══
  console.log('\n═══ MOBILE 390x844 ═══');
  const mobile = await setupAndLogin(browser, 390, 844);
  
  // Dashboard
  await mobile.page.evaluate(() => switchTab('settings'));
  await wait(1000);
  await mobile.page.evaluate(() => renderSettingsDashboard());
  await wait(500);
  await mobile.page.screenshot({ path: '/home/z/my-project/screenshots/mobile-01-dashboard.png' });
  
  // Check bottom-nav visible
  const mobileNav = await mobile.page.evaluate(() => ({
    bottomNavVisible: document.getElementById('bottom-nav')?.offsetParent !== null,
    adminNavVisible: document.querySelector('.admin-nav')?.offsetParent !== null,
    bottomNavOverflow: document.getElementById('bottom-nav')?.scrollWidth > document.getElementById('bottom-nav')?.clientWidth,
  }));
  console.log('Mobile nav state:', JSON.stringify(mobileNav));
  
  // Categories tab
  await mobile.page.evaluate(() => switchTab('categories'));
  await wait(1000);
  await mobile.page.screenshot({ path: '/home/z/my-project/screenshots/mobile-02-categories.png' });
  
  // Start competition
  await mobile.page.evaluate(() => showView('intro'));
  await wait(1000);
  await mobile.page.screenshot({ path: '/home/z/my-project/screenshots/mobile-03-intro.png' });
  await mobile.page.evaluate(() => startCompetition());
  await wait(2000);
  await mobile.page.screenshot({ path: '/home/z/my-project/screenshots/mobile-04-cat-select.png' });
  
  // Select first category
  await mobile.page.evaluate(() => {
    const cards = document.querySelectorAll('#cats-pres-grid > div');
    if (cards.length > 0) cards[0].click();
  });
  await wait(3000);
  await mobile.page.screenshot({ path: '/home/z/my-project/screenshots/mobile-05-question.png' });
  
  // Check for off-screen elements on mobile question screen
  const mobileOffscreen = await mobile.page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const problematic = [];
    document.querySelectorAll('button, [onclick], .option-btn, .lifeline-btn').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (r.right > vw + 5 || r.left < -5) {
        problematic.push({
          text: el.textContent?.trim().slice(0, 25),
          right: Math.round(r.right),
          left: Math.round(r.left),
          viewport: vw,
        });
      }
    });
    return problematic.slice(0, 10);
  });
  console.log('Mobile off-screen elements:', mobileOffscreen.length === 0 ? 'NONE ✓' : JSON.stringify(mobileOffscreen, null, 2));
  
  // Check overflow
  const mobileOverflow = await mobile.page.evaluate(() => ({
    bodyScrollH: document.body.scrollHeight,
    bodyClientH: document.body.clientHeight,
    hasVerticalScroll: document.body.scrollHeight > document.body.clientHeight,
    htmlScrollW: document.documentElement.scrollWidth,
    htmlClientW: document.documentElement.clientWidth,
    hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  console.log('Mobile overflow:', JSON.stringify(mobileOverflow));
  
  console.log(`Mobile errors: ${mobile.errors.length}`);
  if (mobile.errors.length > 0) {
    [...new Set(mobile.errors)].slice(0, 5).forEach(e => console.log('  ' + e.slice(0, 100)));
  }
  
  await mobile.ctx.close();
  
  // ══ TABLET 768px ══
  console.log('\n═══ TABLET 768x1024 ═══');
  const tablet = await setupAndLogin(browser, 768, 1024);
  await tablet.page.evaluate(() => switchTab('settings'));
  await wait(1000);
  await tablet.page.screenshot({ path: '/home/z/my-project/screenshots/tablet-01-dashboard.png' });
  
  await tablet.page.evaluate(() => showView('intro'));
  await wait(1000);
  await tablet.page.evaluate(() => startCompetition());
  await wait(2000);
  await tablet.page.screenshot({ path: '/home/z/my-project/screenshots/tablet-02-cat-select.png' });
  
  const tabletNav = await tablet.page.evaluate(() => ({
    bottomNavVisible: document.getElementById('bottom-nav')?.offsetParent !== null,
    adminNavVisible: document.querySelector('.admin-nav')?.offsetParent !== null,
  }));
  console.log('Tablet nav state:', JSON.stringify(tabletNav));
  
  console.log(`Tablet errors: ${tablet.errors.length}`);
  await tablet.ctx.close();
  
  await browser.close();
  console.log('\n✓ Done');
})();
