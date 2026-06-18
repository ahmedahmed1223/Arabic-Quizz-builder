// Find what team/timer elements exist on question screen
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
  await page.evaluate(() => { Wizard.setLang('ar'); Wizard.setSetupMode('quick'); Wizard.selectMode('turns'); });
  for (let i = 0; i < 4; i++) { await page.evaluate(() => Wizard.next()); await page.waitForTimeout(300); }
  await page.evaluate(() => {
    const p = document.getElementById('wiz-password'), p2 = document.getElementById('wiz-password2');
    if (p) p.value = '1234'; if (p2) p2.value = '1234';
    try { Wizard.data.password = '1234'; } catch(e){}
  });
  await page.evaluate(() => Wizard.finish());
  await page.waitForTimeout(2500);
  await page.click('[onclick="showLoginPassword()"]'); await page.waitForTimeout(500);
  await page.fill('#login-password-input', '1234');
  await page.click('[onclick="doLogin()"]'); await page.waitForTimeout(2000);
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    saveState();
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => showView('intro'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => startCompetition());
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const cards = document.querySelectorAll('#cats-pres-grid > div');
    if (cards.length > 0) cards[0].click();
  });
  await page.waitForTimeout(3000);
  
  // List ALL elements in #view-question with their IDs, classes, text, and visibility
  const allElements = await page.evaluate(() => {
    const view = document.getElementById('view-question') || document.querySelector('[class*="question"]');
    if (!view) return { error: 'No question view found' };
    
    const els = [...view.querySelectorAll('*')].map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const visible = r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
      return {
        tag: el.tagName,
        id: el.id || '',
        cls: String(el.className || '').slice(0, 60),
        text: el.textContent?.trim().slice(0, 50) || '',
        visible,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      };
    }).filter(e => e.id || (e.cls && e.visible));  // Only elements with id/class that are visible
    
    return { 
      viewId: view.id,
      visibleCount: els.filter(e => e.visible).length,
      elements: els.slice(0, 40),  // First 40 elements
    };
  });
  
  console.log('Question view ID:', allElements.viewId);
  console.log('Visible elements:', allElements.visibleCount);
  console.log('\n=== Top elements ===');
  allElements.elements.forEach((e, i) => {
    if (e.visible) {
      console.log(`  [${i}] ${e.tag} #${e.id} .${e.cls.slice(0,30)} @ (${e.rect.x},${e.rect.y}) ${e.rect.w}x${e.rect.h} "${e.text.slice(0,30)}"`);
    }
  });
  
  // Specifically look for team name / timer / score elements
  console.log('\n=== Looking for team/timer/score ===');
  const specific = await page.evaluate(() => {
    const results = {};
    // Team name
    ['q-team-name', 'current-team', 'team-display', 'q-current-team'].forEach(id => {
      const el = document.getElementById(id);
      results[id] = el ? { found: true, visible: el.offsetParent !== null, text: el.textContent?.slice(0, 40) } : { found: false };
    });
    // Timer
    ['q-timer', 'timer-display', 'timer-text', 'q-timer-display', 'q-timer-text'].forEach(id => {
      const el = document.getElementById(id);
      results[id] = el ? { found: true, visible: el.offsetParent !== null, text: el.textContent?.slice(0, 40) } : { found: false };
    });
    // Any element containing team name
    const allText = document.body.innerText;
    const teamName1 = 'فريق النجوم';
    const teamName2 = 'فريق القمر';
    results.teamName1InBody = allText.includes(teamName1);
    results.teamName2InBody = allText.includes(teamName2);
    return results;
  });
  console.log(JSON.stringify(specific, null, 2));
  
  await page.screenshot({ path: '/home/z/my-project/screenshots/question-screen-detail.png' });
  
  await browser.close();
})();
