// Inspect solo mode state more carefully
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
  
  // Start solo game
  await page.evaluate(() => { try { startSoloGame(); } catch(e){console.error(e);} });
  await wait(2500);
  
  // Inspect solo state in detail
  const soloDetail = await page.evaluate(() => {
    return {
      currentView: window._currentView,
      // Check soloProgress structure
      soloProgress: state.soloProgress ? {
        totalLevels: state.soloProgress.totalLevels,
        levelsCount: Object.keys(state.soloProgress.levels || {}).length,
        sampleLevels: Object.entries(state.soloProgress.levels || {}).slice(0, 3),
      } : null,
      // Check what's visible
      soloMapVisible: (() => {
        const v = document.getElementById('view-solo-map');
        return v && v.offsetParent !== null;
      })(),
      // Count visible worlds/categories
      visibleSoloCards: document.querySelectorAll('.solo-world, .solo-cat-card, [onclick*="playSolo"]').length,
      // Check for stars display
      starsElements: [...document.querySelectorAll('[id*="stars"], [class*="stars"]')].filter(el => el.offsetParent !== null).map(el => ({
        id: el.id,
        cls: String(el.className || '').slice(0, 30),
        text: el.textContent?.trim().slice(0, 40),
      })),
      // Check for locked levels
      lockedLevels: document.querySelectorAll('.solo-locked, .locked, [class*="lock"]').length,
      // Body text snippet
      bodyText: document.body.innerText.slice(0, 600),
    };
  });
  
  console.log('=== Solo Mode Detail ===');
  console.log(JSON.stringify(soloDetail, null, 2));
  
  // Take a fresh screenshot
  await page.screenshot({ path: '/home/z/my-project/screenshots/solo-detail.png' });
  
  // Check for visual issues in solo map
  const issues = await page.evaluate(() => {
    const issues = [];
    
    // Check for off-screen elements
    const vw = window.innerWidth, vh = window.innerHeight;
    document.querySelectorAll('#view-solo-map *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 50 || r.left < -50 || r.bottom > vh + 200) {
        issues.push({
          type: 'off-screen',
          tag: el.tagName,
          id: el.id,
          cls: String(el.className || '').slice(0, 30),
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        });
      }
    });
    
    // Check for text overflow
    document.querySelectorAll('#view-solo-map *').forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        const text = el.textContent?.trim().slice(0, 30);
        if (text && text.length > 0) {
          issues.push({
            type: 'text-overflow',
            text,
            scrollW: el.scrollWidth,
            clientW: el.clientWidth,
          });
        }
      }
    });
    
    return issues.slice(0, 20);
  });
  
  console.log('\n=== Solo Map Issues ===');
  console.log(`Found ${issues.length} potential issues`);
  issues.forEach((i, idx) => console.log(`  [${idx}] ${JSON.stringify(i).slice(0, 150)}`));
  
  await browser.close();
})();
