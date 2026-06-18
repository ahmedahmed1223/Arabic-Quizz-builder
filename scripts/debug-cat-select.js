// Verify the actual category-select screen renders cards after startCompetition
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

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
  
  // Login
  await page.click('[onclick="showLoginPassword()"]');
  await page.waitForTimeout(500);
  await page.fill('#login-password-input', '1234');
  await page.click('[onclick="doLogin()"]');
  await page.waitForTimeout(2000);
  
  // Add teams
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    saveState();
  });
  await page.waitForTimeout(1000);
  
  // Start competition
  await page.evaluate(() => showView('intro'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => startCompetition());
  await page.waitForTimeout(2000);
  
  // Detailed inspection of category-select screen
  const screenInfo = await page.evaluate(() => ({
    currentView: window._currentView,
    gameActive: state.gameActive,
    stateCatsCount: state.categories.length,
    playableCatsCount: getPlayableCats({all:true}).length,
    usedQuestionsKeys: Object.keys(state.usedQuestions || {}).length,
    catsGridExists: !!document.getElementById('cats-pres-grid'),
    catsGridChildren: document.getElementById('cats-pres-grid')?.children?.length || 0,
    catsGridDisplay: document.getElementById('cats-pres-grid') ? getComputedStyle(document.getElementById('cats-pres-grid')).display : null,
    // Check what's actually visible
    visibleScreenText: document.getElementById('view-categories')?.innerText?.slice(0, 300),
    // Check for empty state
    emptyStateVisible: !!document.querySelector('#view-categories .empty-state'),
  }));
  console.log('=== Category-select screen state ===');
  console.log(JSON.stringify(screenInfo, null, 2));
  
  await page.screenshot({ path: '/home/z/my-project/screenshots/debug-cat-select.png', fullPage: false });
  
  // Try manually calling renderCatsSlide
  console.log('\n--- Forcing renderCatsSlide() ---');
  await page.evaluate(() => {
    try { renderCatsSlide(); } catch(e) { console.error('renderCatsSlide err:', e); }
  });
  await page.waitForTimeout(1000);
  
  const afterForce = await page.evaluate(() => ({
    catsGridChildren: document.getElementById('cats-pres-grid')?.children?.length || 0,
    visibleCards: document.querySelectorAll('#cats-pres-grid .cat-card, #cats-pres-grid [onclick*="selectCategory"]').length,
  }));
  console.log('After force render:', JSON.stringify(afterForce, null, 2));
  
  await page.screenshot({ path: '/home/z/my-project/screenshots/debug-cat-select-after-force.png' });
  
  await browser.close();
})();
