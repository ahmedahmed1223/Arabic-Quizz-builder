// Inspect the actual state on the categories-select screen after startCompetition
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
  
  // Login
  await page.click('[onclick="showLoginPassword()"]').catch(()=>{});
  await page.waitForTimeout(500);
  await page.fill('#login-password-input', '1234');
  await page.click('[onclick="doLogin()"]');
  await page.waitForTimeout(1500);
  
  // Add 2 teams
  await page.evaluate(() => {
    state.teams.push({id:'team_test_1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'team_test_2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    if (typeof saveState === 'function') saveState();
  });
  await page.waitForTimeout(500);
  
  // Start competition
  await page.evaluate(() => {
    if (typeof showView === 'function') showView('intro');
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    if (typeof startCompetition === 'function') startCompetition();
  });
  await page.waitForTimeout(2000);
  
  // Inspect state
  const stateInfo = await page.evaluate(() => {
    return {
      currentView: window._currentView,
      currentCatId: state.currentCatId,
      currentQIndex: state.currentQIndex,
      currentTeamIndex: state.currentTeamIndex,
      gameActive: state.gameActive,
      teamsCount: state.teams.length,
      catsCount: state.categories.length,
      // Check what view is visible
      visibleViews: ['intro','admin','categories','question','scores','credits','podium','solo-map']
        .filter(v => {
          const el = document.getElementById('view-'+v);
          return el && !el.classList.contains('hidden');
        }),
      // Check for category cards visible
      catCardsVisible: document.querySelectorAll('#categories-grid .cat-card, .category-card, [onclick*="selectCategory"]').length,
      // Check for "Select category" prompts
      bodyText: document.body.innerText.slice(0, 500),
    };
  });
  
  console.log('=== State after startCompetition() ===');
  console.log(JSON.stringify(stateInfo, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: '/home/z/my-project/screenshots/host-flow-debug-start.png' });
  
  // Try clicking first category card
  const catCard = await page.$('#categories-grid .cat-card, .category-card, [onclick*="selectCategory"]');
  if (catCard) {
    console.log('\nClicking first category card...');
    await catCard.click().catch(()=>{});
    await page.waitForTimeout(1500);
    
    // Re-check state
    const after = await page.evaluate(() => ({
      currentView: window._currentView,
      currentCatId: state.currentCatId,
      currentQIndex: state.currentQIndex,
      hasQuestion: !!document.querySelector('.question-text-main, #q-text-main, .option-btn, #opt-btn-0'),
    }));
    console.log('After clicking category:', JSON.stringify(after, null, 2));
    
    await page.screenshot({ path: '/home/z/my-project/screenshots/host-flow-debug-after-cat.png' });
  } else {
    console.log('No category card found!');
  }
  
  await browser.close();
})();
