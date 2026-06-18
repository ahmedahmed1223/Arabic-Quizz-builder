// Verify mobile quiz flow end-to-end
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
  
  // ══ Mobile admin dashboard ══
  console.log('▶ Mobile admin dashboard');
  await page.evaluate(() => switchTab('settings'));
  await wait(1000);
  await page.evaluate(() => renderSettingsDashboard());
  await wait(500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/mobile-final-01-admin.png' });
  
  // Check bottom-nav all visible
  const navCheck = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.bottom-nav-item')];
    const visible = items.filter(b => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.right <= window.innerWidth + 5 && r.left >= -5;
    });
    return { total: items.length, visible: visible.length, allInViewport: visible.length === items.length };
  });
  console.log(`  Bottom nav: ${navCheck.visible}/${navCheck.total} visible in viewport`);
  
  // ══ Mobile categories ══
  console.log('▶ Mobile categories');
  await page.evaluate(() => switchTab('categories'));
  await wait(1000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/mobile-final-02-categories.png' });
  
  // ══ Mobile start competition ══
  console.log('▶ Mobile start competition');
  await page.evaluate(() => showView('intro'));
  await wait(1000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/mobile-final-03-intro.png' });
  await page.evaluate(() => startCompetition());
  await wait(2000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/mobile-final-04-cat-select.png' });
  
  // Check cat cards visible on mobile
  const catCheck = await page.evaluate(() => {
    const grid = document.getElementById('cats-pres-grid');
    if (!grid) return { error: 'no grid' };
    const cards = [...grid.children];
    const visible = cards.filter(c => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.right <= window.innerWidth + 5;
    });
    return { total: cards.length, visible: visible.length };
  });
  console.log(`  Cat cards: ${catCheck.visible}/${catCheck.total} visible`);
  
  // ══ Mobile question ══
  console.log('▶ Mobile question');
  await page.evaluate(() => {
    const cards = document.querySelectorAll('#cats-pres-grid > div');
    if (cards.length > 0) cards[0].click();
  });
  await wait(3000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/mobile-final-05-question.png' });
  
  // Check question screen elements
  const qCheck = await page.evaluate(() => ({
    hasQuestionText: !!document.querySelector('#q-text-main'),
    hasTeamLabel: !!document.querySelector('#q-team-label'),
    hasTimer: !!document.querySelector('#timer-wrapper'),
    hasOptions: document.querySelectorAll('.option-btn, [id^="opt-btn-"]').length,
    offscreenButtons: [...document.querySelectorAll('button')].filter(b => {
      const r = b.getBoundingClientRect();
      if (r.width === 0) return false;
      const cs = getComputedStyle(b);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      return r.right > window.innerWidth + 5 || r.left < -5;
    }).length,
  }));
  console.log('  Question screen:', JSON.stringify(qCheck));
  
  // ══ Mobile answer ══
  console.log('▶ Mobile answer');
  const correctIdx = await page.evaluate(() => {
    const cat = state.categories.find(c => c.id === state.currentCatId);
    const q = cat?.questions?.[state.currentQIndex];
    return q?.correct;
  });
  if (correctIdx !== undefined && correctIdx !== null) {
    await page.click(`#opt-btn-${correctIdx}`).catch(()=>{});
    await wait(2500);
    await page.screenshot({ path: '/home/z/my-project/screenshots/mobile-final-06-answer.png' });
    
    const score = await page.evaluate(() => state.teams[state.currentTeamIndex]?.score);
    console.log(`  Score after correct answer: ${score}`);
  }
  
  console.log(`\nErrors: ${errors.length}`);
  if (errors.length > 0) {
    [...new Set(errors)].slice(0, 10).forEach(e => console.log('  ' + e.slice(0, 120)));
  }
  
  await browser.close();
})();
