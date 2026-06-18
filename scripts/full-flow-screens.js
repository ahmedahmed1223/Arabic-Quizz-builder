// Capture every screen of a real quiz flow: select cat → question → answer → next → scores → podium
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz'));
    keys.forEach(k => localStorage.removeItem(k));
  });
  const page = await ctx.newPage();
  
  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
  
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  
  // Wizard
  await page.evaluate(() => {
    Wizard.setLang('ar'); Wizard.setSetupMode('quick'); Wizard.selectMode('turns');
  });
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => Wizard.next());
    await wait(300);
  }
  await page.evaluate(() => {
    const p = document.getElementById('wiz-password');
    const p2 = document.getElementById('wiz-password2');
    if (p) p.value = '1234';
    if (p2) p2.value = '1234';
    try { Wizard.data.password = '1234'; } catch(e){}
  });
  await page.evaluate(() => Wizard.finish());
  await wait(2500);
  
  // Login
  await page.click('[onclick="showLoginPassword()"]');
  await wait(500);
  await page.fill('#login-password-input', '1234');
  await page.click('[onclick="doLogin()"]');
  await wait(2000);
  
  // Add teams
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    saveState();
  });
  await wait(1000);
  
  // ══ SCREEN 1: Dashboard (verified) ══
  console.log('▶ 01-dashboard');
  await page.evaluate(() => switchTab('settings'));
  await wait(1000);
  // Force re-render
  await page.evaluate(() => renderSettingsDashboard());
  await wait(500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-01-dashboard.png' });
  
  // ══ SCREEN 2: Start competition → category select ══
  console.log('▶ 02-cat-select');
  await page.evaluate(() => showView('intro'));
  await wait(1000);
  await page.evaluate(() => startCompetition());
  await wait(2000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-02-cat-select.png' });
  
  // ══ SCREEN 3: Click first category → question ══
  console.log('▶ 03-question');
  // Find the first category card
  const catClicked = await page.evaluate(() => {
    // Find a clickable category card in the categories-pres-grid
    const cards = document.querySelectorAll('#cats-pres-grid [onclick*="selectCategory"], #cats-pres-grid .cat-pres-card, #cats-pres-grid > div');
    if (cards.length > 0) {
      cards[0].click();
      return { ok: true, count: cards.length, firstClass: cards[0].className };
    }
    return { ok: false, count: 0 };
  });
  console.log('  Category click:', JSON.stringify(catClicked));
  await wait(2500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-03-question.png' });
  
  const qInfo = await page.evaluate(() => {
    const cat = state.categories.find(c => c.id === state.currentCatId);
    const q = cat?.questions?.[state.currentQIndex];
    return {
      hasQuestion: !!document.querySelector('.question-text-main, #q-text-main, #q-options-grid'),
      qText: q?.text?.slice(0, 100),
      qType: q?.type,
      optBtns: document.querySelectorAll('.option-btn, [id^="opt-btn-"]').length,
      correctIdx: q?.correct,
      currentTeam: state.teams[state.currentTeamIndex]?.name,
      timerVisible: !!document.querySelector('#timer-display, #q-timer, .timer-display'),
    };
  });
  console.log('  Question info:', JSON.stringify(qInfo));
  
  // ══ SCREEN 4: Click correct answer → reveal ══
  console.log('▶ 04-answer-reveal');
  if (qInfo.correctIdx !== undefined && qInfo.correctIdx !== null) {
    const correctBtn = await page.$(`#opt-btn-${qInfo.correctIdx}`);
    if (correctBtn) {
      await correctBtn.click();
      await wait(2500);
      await page.screenshot({ path: '/home/z/my-project/screenshots/flow-04-answer-reveal.png' });
      
      const scoreInfo = await page.evaluate(() => ({
        team: state.teams[state.currentTeamIndex]?.name,
        score: state.teams[state.currentTeamIndex]?.score,
        answered: state.answered,
      }));
      console.log('  Score after correct answer:', JSON.stringify(scoreInfo));
    }
  }
  
  // ══ SCREEN 5: Next question ══
  console.log('▶ 05-next-question');
  // Find "Next" button
  const nextClicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const nextBtn = btns.find(b => {
      const t = b.textContent.trim();
      return (t.includes('التالي') || t.includes('Next') || t.includes('السؤال التالي')) 
        && getComputedStyle(b).display !== 'none' && b.offsetParent !== null;
    });
    if (nextBtn) { nextBtn.click(); return { ok: true, text: nextBtn.textContent.trim() }; }
    return { ok: false };
  });
  console.log('  Next button:', JSON.stringify(nextClicked));
  await wait(2500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-05-next-question.png' });
  
  // ══ SCREEN 6: Answer wrong (to test wrong-answer path) ══
  console.log('▶ 06-wrong-answer');
  const wrongIdx = await page.evaluate(() => {
    const cat = state.categories.find(c => c.id === state.currentCatId);
    const q = cat?.questions?.[state.currentQIndex];
    if (!q || q.correct === undefined) return -1;
    // Find first wrong option
    for (let i = 0; i < (q.options?.length || 0); i++) {
      if (i !== q.correct) return i;
    }
    return -1;
  });
  if (wrongIdx >= 0) {
    const wrongBtn = await page.$(`#opt-btn-${wrongIdx}`);
    if (wrongBtn) {
      await wrongBtn.click();
      await wait(2500);
      await page.screenshot({ path: '/home/z/my-project/screenshots/flow-06-wrong-answer.png' });
    }
  }
  
  // ══ SCREEN 7: Go to scores screen ══
  console.log('▶ 07-scores');
  await page.evaluate(() => showView('scores'));
  await wait(2000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-07-scores.png' });
  
  // ══ SCREEN 8: Podium ══
  console.log('▶ 08-podium');
  await page.evaluate(() => { try { showPodium(); } catch(e){console.error(e);} });
  await wait(2500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-08-podium.png' });
  
  // ══ SCREEN 9: Back to admin → reports ══
  console.log('▶ 09-reports');
  await page.evaluate(() => { try { closeModal('modal-generic'); } catch(e){} });
  await page.evaluate(() => showView('admin'));
  await wait(1000);
  await page.evaluate(() => switchTab('reports'));
  await wait(1500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-09-reports.png' });
  
  // ══ SCREEN 10: Mobile view (390px) — competition ══
  console.log('▶ 10-mobile-cat-select');
  // Restart — go to category select
  await page.evaluate(() => showView('categories'));
  await wait(1000);
  // Resize to mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await wait(800);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-10-mobile-cat-select.png' });
  
  // ══ SCREEN 11: Mobile — question ══
  console.log('▶ 11-mobile-question');
  // Click first category
  await page.evaluate(() => {
    const cards = document.querySelectorAll('#cats-pres-grid [onclick*="selectCategory"], #cats-pres-grid > div');
    if (cards.length > 0) cards[0].click();
  });
  await wait(2500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-11-mobile-question.png' });
  
  // ══ SCREEN 12: Mobile — admin dashboard ══
  console.log('▶ 12-mobile-admin');
  await page.evaluate(() => showView('admin'));
  await wait(1000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-12-mobile-admin.png' });
  
  // ══ SCREEN 13: Mobile — teams ══
  console.log('▶ 13-mobile-teams');
  await page.evaluate(() => switchTab('teams'));
  await wait(1500);
  await page.screenshot({ path: '/home/z/my-project/screenshots/flow-13-mobile-teams.png' });
  
  console.log('\n═══════════════════════════════════════════');
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    [...new Set(errors)].slice(0, 15).forEach(e => console.log('  ' + e));
  }
  
  await browser.close();
})();
