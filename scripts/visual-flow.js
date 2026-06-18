// Capture visual state + DOM info at each key step of the host flow.
// Focus on identifying REAL visual issues that need fixing.
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

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
  
  // Walk through wizard
  await page.evaluate(() => {
    Wizard.setLang('ar'); Wizard.setSetupMode('quick'); Wizard.selectMode('turns');
  });
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => Wizard.next());
    await page.waitForTimeout(300);
  }
  // Fill password (skip if not visible — quick mode may hide it)
  await page.evaluate(() => {
    const p = document.getElementById('wiz-password');
    const p2 = document.getElementById('wiz-password2');
    if (p) p.value = '1234';
    if (p2) p2.value = '1234';
    // Also set via Wizard data
    try { Wizard.data.password = '1234'; } catch(e){}
  });
  await page.evaluate(() => Wizard.finish());
  await page.waitForTimeout(2500);
  
  // Login
  await page.click('[onclick="showLoginPassword()"]');
  await page.waitForTimeout(500);
  await page.fill('#login-password-input', '1234');
  await page.click('[onclick="doLogin()"]');
  await page.waitForTimeout(1500);
  
  // Add 2 teams
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    saveState();
  });
  await page.waitForTimeout(800);
  
  // ── KEY MOMENT 1: Admin dashboard with stats
  console.log('\n═══ KEY MOMENT 1: Admin dashboard ═══');
  await page.evaluate(() => switchTab('settings'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/home/z/my-project/screenshots/verify-01-dashboard.png' });
  
  const dashStats = await page.evaluate(() => ({
    totalQ: document.getElementById('dash-total-q')?.textContent,
    totalCats: document.getElementById('dash-total-cats')?.textContent,
    totalTeams: document.getElementById('dash-total-teams')?.textContent,
    sessions: document.getElementById('dash-sessions')?.textContent,
    quizStatus: document.getElementById('dash-quiz-status')?.textContent,
  }));
  console.log('Dashboard stats:', JSON.stringify(dashStats));
  
  // ── KEY MOMENT 2: Categories grid (after startCompetition)
  console.log('\n═══ KEY MOMENT 2: Start competition → category select ═══');
  await page.evaluate(() => showView('intro'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => startCompetition());
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/verify-02-cat-select.png' });
  
  const catSelectInfo = await page.evaluate(() => ({
    currentView: window._currentView,
    gameActive: state.gameActive,
    catCards: document.querySelectorAll('.cat-card, .category-select-card, [onclick*="selectCategory"]').length,
    visibleText: document.body.innerText.match(/(?:اختر|قسم|فئة|categories|select)[^\n]{0,80}/i)?.[0],
  }));
  console.log('Cat select info:', JSON.stringify(catSelectInfo, null, 2));
  
  // ── KEY MOMENT 3: Click first category → first question
  console.log('\n═══ KEY MOMENT 3: Click first category ═══');
  const firstCat = await page.$('.cat-card, .category-select-card, [onclick*="selectCategory"]');
  if (firstCat) {
    await firstCat.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/home/z/my-project/screenshots/verify-03-first-question.png' });
    
    const qInfo = await page.evaluate(() => {
      const cat = state.categories.find(c => c.id === state.currentCatId);
      const q = cat?.questions?.[state.currentQIndex];
      return {
        currentCatId: state.currentCatId,
        currentQIndex: state.currentQIndex,
        currentTeam: state.teams[state.currentTeamIndex]?.name,
        qText: q?.text?.slice(0, 100),
        qType: q?.type,
        correctIdx: q?.correct,
        optCount: q?.options?.length,
        hasQuestionEl: !!document.querySelector('.question-text-main, #q-text-main'),
        optionBtns: document.querySelectorAll('.option-btn, [id^="opt-btn-"]').length,
      };
    });
    console.log('Question info:', JSON.stringify(qInfo, null, 2));
    
    // ── KEY MOMENT 4: Click correct answer
    console.log('\n═══ KEY MOMENT 4: Answer question correctly ═══');
    if (qInfo.correctIdx !== undefined && qInfo.correctIdx !== null) {
      const correctBtn = await page.$(`#opt-btn-${qInfo.correctIdx}`);
      if (correctBtn) {
        await correctBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/home/z/my-project/screenshots/verify-04-after-answer.png' });
        
        const scoreInfo = await page.evaluate(() => ({
          teamName: state.teams[state.currentTeamIndex]?.name,
          teamScore: state.teams[state.currentTeamIndex]?.score,
          answered: state.answered,
          hasRevealAnimation: !!document.querySelector('.correct-answer, .wrong-answer, .reveal-anim'),
        }));
        console.log('Score info:', JSON.stringify(scoreInfo, null, 2));
      }
    }
    
    // ── KEY MOMENT 5: Next question
    console.log('\n═══ KEY MOMENT 5: Next question ═══');
    const nextBtn = await page.$('button:has-text("التالي"), button:has-text("السؤال التالي"), [onclick*="nextQuestion"], #btn-next-q, #btn-next');
    if (nextBtn) {
      const visible = await nextBtn.isVisible().catch(()=>false);
      if (visible) {
        await nextBtn.click().catch(()=>{});
        await page.waitForTimeout(1500);
      } else {
        await page.evaluate(() => { try { nextQuestion(); } catch(e){} });
        await page.waitForTimeout(1500);
      }
    } else {
      await page.evaluate(() => { try { nextQuestion(); } catch(e){} });
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: '/home/z/my-project/screenshots/verify-05-next-question.png' });
    
    const nextInfo = await page.evaluate(() => ({
      currentTeam: state.teams[state.currentTeamIndex]?.name,
      currentCatId: state.currentCatId,
      currentQIndex: state.currentQIndex,
      onQuestion: !!document.querySelector('.question-text-main, #q-text-main'),
    }));
    console.log('After next:', JSON.stringify(nextInfo, null, 2));
  }
  
  // ── KEY MOMENT 6: Podium
  console.log('\n═══ KEY MOMENT 6: Show podium ═══');
  await page.evaluate(() => showView('admin'));
  await page.waitForTimeout(500);
  await page.evaluate(() => { try { showPodium(); } catch(e){console.error(e);} });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/verify-06-podium.png' });
  
  // ── KEY MOMENT 7: Mobile view (390px) of admin dashboard
  console.log('\n═══ KEY MOMENT 7: Mobile view ═══');
  await page.evaluate(() => { try { closeModal('modal-generic'); } catch(e){} });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.evaluate(() => showView('admin'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/home/z/my-project/screenshots/verify-07-mobile-admin.png' });
  
  await browser.close();
  console.log('\n✓ Done');
})();
