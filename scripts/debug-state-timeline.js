// Debug the actual state.categories timeline
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz'));
    keys.forEach(k => localStorage.removeItem(k));
  });
  const page = await ctx.newPage();
  
  const catsLog = [];
  page.on('console', m => {
    const txt = m.text();
    if (txt.includes('Wizard') || txt.includes('Init') || txt.includes('categories') || txt.includes('State')) {
      catsLog.push(`[${m.type()}] ${txt}`);
    }
  });
  
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  // Walk through wizard
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
  
  // Track state.categories over time
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => ({
      cats: state?.categories?.length || 0,
      view: window._currentView,
      wizardActive: document.getElementById('wizard-overlay')?.classList.contains('active'),
      setupDone: !!localStorage.getItem('quiz_v4_setup_done'),
    }));
    console.log(`t=${i*0.5}s:`, JSON.stringify(info));
  }
  
  console.log('\n=== Relevant console logs ===');
  catsLog.slice(-15).forEach(l => console.log(l));
  
  await browser.close();
})();
