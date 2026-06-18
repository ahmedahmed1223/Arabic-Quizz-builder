// Track state.categories over time WITH login to find when it gets wiped
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz'));
    keys.forEach(k => localStorage.removeItem(k));
  });
  const page = await ctx.newPage();
  
  // Capture console logs
  page.on('console', m => {
    const txt = m.text();
    if (txt.includes('loadPrimaryState') || txt.includes('categories') || txt.includes('State load')) {
      console.log(`[browser ${m.type()}] ${txt.slice(0, 120)}`);
    }
  });
  
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  // Wizard
  await page.evaluate(() => {
    Wizard.setLang('ar'); Wizard.setSetupMode('quick'); Wizard.selectMode('turns');
  });
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => Wizard.next());
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    const p = document.getElementById('wiz-password');
    const p2 = document.getElementById('wiz-password2');
    if (p) p.value = '1234';
    if (p2) p2.value = '1234';
    try { Wizard.data.password = '1234'; } catch(e){}
  });
  await page.evaluate(() => Wizard.finish());
  await page.waitForTimeout(2500);
  
  // Track state BEFORE login
  const beforeLogin = await page.evaluate(() => ({
    cats: state?.categories?.length || 0,
    view: window._currentView,
    pwd: state?.settings?.password?.slice(0, 10),
  }));
  console.log('Before login:', JSON.stringify(beforeLogin));
  
  // Login
  await page.click('[onclick="showLoginPassword()"]');
  await page.waitForTimeout(500);
  await page.fill('#login-password-input', '1234');
  await page.click('[onclick="doLogin()"]');
  await page.waitForTimeout(1500);
  
  // Track state AFTER login
  const afterLogin = await page.evaluate(() => ({
    cats: state?.categories?.length || 0,
    view: window._currentView,
    pwd: state?.settings?.password?.slice(0, 10),
  }));
  console.log('After login:', JSON.stringify(afterLogin));
  
  // Wait more and track
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => ({
      cats: state?.categories?.length || 0,
      view: window._currentView,
      time: Date.now(),
    }));
    console.log(`t=${5+i*0.5}s:`, JSON.stringify(info));
    if (info.cats === 0) break;  // Stop if cats got wiped
  }
  
  // Check IDB
  const idbInfo = await page.evaluate(async () => {
    try {
      const result = await MediaDB.loadPrimaryState();
      if (result && result.core) {
        const ps = JSON.parse(result.core);
        return {
          hasData: true,
          cats: ps.categories?.length || 0,
          pwd: ps.settings?.password?.slice(0, 10),
        };
      }
      return { hasData: false };
    } catch (e) { return { error: e.message }; }
  });
  console.log('IDB primary state:', JSON.stringify(idbInfo));
  
  await browser.close();
})();
