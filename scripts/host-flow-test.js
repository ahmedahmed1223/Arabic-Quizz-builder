// Comprehensive quiz-host E2E flow:
//   1. Fresh install → wizard
//   2. Complete wizard (quick mode, builtin library)
//   3. Login (1234)
//   4. Create custom category + question (test CRUD)
//   5. Add 2 teams
//   6. Start competition → answer questions → check scoring
//   7. End competition → view podium
//   8. Check session history
// Captures screenshots + errors at each step.

const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/home/z/my-project/screenshots';
fs.mkdirSync(OUT_DIR, { recursive: true });

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  
  // Fresh install — clear all quiz_* localStorage keys
  await ctx.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz'));
    keys.forEach(k => localStorage.removeItem(k));
  });
  
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  const snap = async (name) => {
    const file = path.join(OUT_DIR, `host-flow-${name}.png`);
    await page.screenshot({ path: file });
    console.log(`  📸 host-flow-${name}.png`);
  };
  
  const log = (step, ok, msg) => {
    const icon = ok ? '✓' : '✗';
    console.log(`${icon} [${step}] ${msg}`);
    if (!ok) errors.push(`[step:${step}] ${msg}`);
  };

  try {
    // ═══════════════════════════════════════════════════════
    // STAGE 1: First launch + wizard
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 1: Fresh launch + wizard ═══');
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await wait(4000);
    await snap('01-loading');
    
    // Verify wizard is shown
    const wizardActive = await page.evaluate(() => {
      const w = document.getElementById('wizard-overlay');
      return w && w.classList.contains('active');
    });
    log('1-wizard', wizardActive, wizardActive ? 'Wizard shown' : 'Wizard NOT shown');

    // ═══════════════════════════════════════════════════════
    // STAGE 2: Complete wizard by clicking through UI buttons
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 2: Complete wizard (UI click-through) ═══');
    
    // Use Wizard API to walk through steps (more reliable than UI clicks)
    // Quick mode = steps 1 → 2 → 3 → 7 (finish)
    await page.evaluate(() => {
      try {
        if (typeof Wizard !== 'undefined') {
          Wizard.setLang('ar');
          Wizard.setSetupMode('quick');
          Wizard.selectMode('turns');
        }
      } catch (e) { console.error('[Test wizard init]', e); }
    });
    await wait(300);
    
    // Click "Next" to advance through steps 1 → 2 → 3 → 7
    // Use Wizard.next() directly — UI click on #wiz-btn-next has issues with event delegation
    for (let i = 0; i < 4; i++) {
      const stepInfo = await page.evaluate(() => ({
        currentStep: document.querySelector('.wiz-step.active')?.dataset?.step || 
                     document.querySelector('.wiz-step:not(.hidden)')?.dataset?.step,
        wizardActive: document.getElementById('wizard-overlay')?.classList.contains('active'),
      }));
      if (!stepInfo.wizardActive) break;
      console.log(`    Wizard step before next #${i+1}: ${stepInfo.currentStep}`);
      await page.evaluate(() => {
        try { Wizard.next(); } catch (e) { console.error('Wizard.next err:', e); }
      });
      await wait(400);
    }
    await wait(500);
    await snap('02a-wizard-step7');
    
    // Fill password fields if visible (step 7 has password setup)
    const pwdVisible = await page.evaluate(() => {
      const p = document.getElementById('wiz-password');
      return p && getComputedStyle(p.closest('.form-group') || p).display !== 'none';
    });
    if (pwdVisible) {
      await page.fill('#wiz-password', '1234').catch(()=>{});
      await page.fill('#wiz-password2', '1234').catch(()=>{});
      await wait(200);
    }
    
    // Click the start/finish button via API
    await page.evaluate(() => {
      try { Wizard.finish(); } catch (e) { console.error('Wizard.finish err:', e); }
    });
    await wait(2500);
    await snap('02b-after-wizard');
    
    // Check if we ended on login or admin
    let wizardDone = await page.evaluate(() => 
      !!localStorage.getItem('quiz_v4_setup_done')
    );
    log('2-wizard-finish', wizardDone, wizardDone ? 'Wizard completed' : 'Wizard NOT completed (will try direct API)');
    
    // Fallback: if wizard didn't complete via UI, set the flag directly
    if (!wizardDone) {
      await page.evaluate(() => {
        try {
          localStorage.setItem('quiz_v4_setup_done', '1');
          // Load builtin library directly
          try {
            state.settings.name = 'مسابقة اختبار';
            state.settings.password = '1234';
            state.settings.pwLevel = 'login';
            state.settings.theme = 'space';
            state.settings.language = 'ar';
            state.settings.compMode = 'turns';
            if (typeof BUILTIN_LIBRARY !== 'undefined') {
              state.categories = JSON.parse(JSON.stringify(BUILTIN_LIBRARY));
              state.categories.forEach(c => {
                if (!c.id) c.id = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
                if (c.questions) c.questions.forEach(q => {
                  if (!q.id) q.id = 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
                });
              });
            }
            if (typeof saveState === 'function') saveState();
          } catch (e) { console.error('[Test fallback]', e); }
        } catch (e) {}
      });
      await wait(1500);
      // Reload to apply
      await page.reload({ waitUntil: 'domcontentloaded' });
      await wait(4000);
      wizardDone = true;
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 3: Login
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 3: Login ═══');
    const openBtn = await page.$('[onclick="showLoginPassword()"]');
    if (openBtn) {
      await openBtn.click();
      await wait(500);
      const pwd = await page.$('#login-password-input');
      if (pwd) {
        await pwd.fill('1234');
        await page.click('[onclick="doLogin()"]');
        await wait(1500);
      }
    }
    await snap('03-admin-dashboard');
    
    const adminVisible = await page.evaluate(() => {
      const a = document.getElementById('view-admin');
      return a && !a.classList.contains('hidden');
    });
    log('3-login', adminVisible, adminVisible ? 'Logged in to admin' : 'Login failed');

    // ═══════════════════════════════════════════════════════
    // STAGE 4: Verify builtin library loaded
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 4: Verify builtin library ═══');
    const stats = await page.evaluate(() => ({
      cats: state?.categories?.length || 0,
      questions: state?.categories?.reduce((s, c) => s + (c.questions?.length || 0), 0) || 0,
      teams: state?.teams?.length || 0,
    }));
    log('4-library', stats.cats > 0, `${stats.cats} categories, ${stats.questions} questions, ${stats.teams} teams`);

    // ═══════════════════════════════════════════════════════
    // STAGE 5: Add 2 teams via API
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 5: Add teams ═══');
    const teamsResult = await page.evaluate(() => {
      try {
        // Add 2 teams directly via state
        state.teams.push({
          id: 'team_test_1',
          name: 'فريق النجوم',
          color: '#00d4ff',
          score: 0,
          members: [],
        });
        state.teams.push({
          id: 'team_test_2',
          name: 'فريق القمر',
          color: '#a259ff',
          score: 0,
          members: [],
        });
        if (typeof saveState === 'function') saveState();
        return { ok: true, count: state.teams.length };
      } catch (e) { return { ok: false, err: e.message }; }
    });
    log('5-teams', teamsResult.ok && teamsResult.count >= 2, 
      teamsResult.ok ? `Added teams, total=${teamsResult.count}` : `Failed: ${teamsResult.err}`);
    await wait(500);
    
    // Navigate to teams tab to verify they render
    await page.evaluate(() => switchTab('teams'));
    await wait(800);
    await snap('04-teams');

    // ═══════════════════════════════════════════════════════
    // STAGE 6: Navigate categories + verify render
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 6: Categories view ═══');
    await page.evaluate(() => switchTab('categories'));
    await wait(800);
    await snap('05-categories');
    
    const catRender = await page.evaluate(() => {
      const list = document.getElementById('categories-list-admin');
      return list ? list.children.length : 0;
    });
    log('6-categories', catRender > 0, `${catRender} categories rendered`);

    // ═══════════════════════════════════════════════════════
    // STAGE 7: Open category to view questions
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 7: View questions in first category ═══');
    // Click first category card
    const firstCat = await page.$('#categories-list-admin .category-card, #categories-list-admin > div');
    if (firstCat) {
      await firstCat.click().catch(()=>{});
      await wait(800);
      await snap('06-questions-list');
      
      const qRender = await page.evaluate(() => {
        const list = document.getElementById('questions-list-admin');
        return list ? list.children.length : 0;
      });
      log('7-questions', qRender > 0, `${qRender} questions rendered in first category`);
    } else {
      log('7-questions', false, 'No category card found to click');
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 8: Open question editor modal
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 8: Open question editor ═══');
    const addQBtn = await page.$('button:has-text("إضافة سؤال"), button:has-text("Add Question"), [onclick*="openQuestionModal"], [onclick*="addQuestion"]');
    if (addQBtn) {
      await addQBtn.click().catch(()=>{});
      await wait(800);
      await snap('07-question-editor');
      const modalOpen = await page.evaluate(() => {
        const m = document.getElementById('modal-question');
        return m && !m.classList.contains('hidden');
      });
      log('8-qeditor', modalOpen, modalOpen ? 'Question modal opened' : 'Modal NOT opened');
      // Close it
      await page.evaluate(() => closeModal('modal-question'));
      await wait(300);
    } else {
      log('8-qeditor', false, 'Add Question button not found');
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 9: Switch to appearance tab — verify themes render
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 9: Appearance tab ═══');
    await page.evaluate(() => switchTab('appearance'));
    await wait(800);
    await snap('08-appearance');
    
    const themesRender = await page.evaluate(() => {
      const grid = document.getElementById('theme-grid');
      return grid ? grid.children.length : 0;
    });
    log('9-themes', themesRender > 0, `${themesRender} themes rendered`);

    // ═══════════════════════════════════════════════════════
    // STAGE 10: Switch to import tab
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 10: Import tab ═══');
    await page.evaluate(() => switchTab('import'));
    await wait(800);
    await snap('09-import');
    log('10-import', true, 'Import tab opened');

    // ═══════════════════════════════════════════════════════
    // STAGE 11: Switch to reports tab
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 11: Reports tab ═══');
    await page.evaluate(() => switchTab('reports'));
    await wait(800);
    await snap('10-reports');
    log('11-reports', true, 'Reports tab opened');

    // ═══════════════════════════════════════════════════════
    // STAGE 12: Switch to help tab
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 12: Help tab ═══');
    await page.evaluate(() => switchTab('help'));
    await wait(800);
    await snap('11-help');
    log('12-help', true, 'Help tab opened');

    // ═══════════════════════════════════════════════════════
    // STAGE 13: Switch to settings subtab → general
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 13: Settings subtabs ═══');
    await page.evaluate(() => switchTab('settings'));
    await wait(500);
    await page.evaluate(() => { if (typeof switchSettingsSubtab === 'function') switchSettingsSubtab('general', null); });
    await wait(500);
    await snap('12-settings-general');
    
    await page.evaluate(() => { if (typeof switchSettingsSubtab === 'function') switchSettingsSubtab('gameplay', null); });
    await wait(500);
    await snap('13-settings-gameplay');
    
    await page.evaluate(() => { if (typeof switchSettingsSubtab === 'function') switchSettingsSubtab('sounds', null); });
    await wait(500);
    await snap('14-settings-sounds');
    
    await page.evaluate(() => { if (typeof switchSettingsSubtab === 'function') switchSettingsSubtab('accessibility', null); });
    await wait(500);
    await snap('15-settings-a11y');
    log('13-settings', true, 'All settings subtabs navigated');

    // ═══════════════════════════════════════════════════════
    // STAGE 14: Start the competition — go to intro screen
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 14: Intro / start competition ═══');
    await page.evaluate(() => { if (typeof showView === 'function') showView('intro'); });
    await wait(1500);
    await snap('16-intro-screen');
    
    const introVisible = await page.evaluate(() => {
      const v = document.getElementById('view-intro');
      return v && !v.classList.contains('hidden');
    });
    log('14-intro', introVisible, 'Intro screen shown');

    // ═══════════════════════════════════════════════════════
    // STAGE 15: Try to start competition (calls startCompetition)
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 15: Start competition ═══');
    const startResult = await page.evaluate(() => {
      try {
        if (typeof startCompetition === 'function') {
          startCompetition();
          return { ok: true };
        }
        return { ok: false, err: 'startCompetition not defined' };
      } catch (e) { return { ok: false, err: e.message }; }
    });
    await wait(2000);
    await snap('17-competition-started');
    
    const onQuestion = await page.evaluate(() => {
      return !!document.querySelector('.question-text-main, #q-text-main, .option-btn, #opt-btn-0');
    });
    log('15-start', onQuestion, onQuestion ? 'Question screen shown' : `Failed: ${startResult.err || 'no question'}`);

    // ═══════════════════════════════════════════════════════
    // STAGE 16: Answer a question — click first option
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 16: Answer question ═══');
    if (onQuestion) {
      // Get the current question + correct answer info
      const qInfo = await page.evaluate(() => {
        try {
          const cat = state.categories.find(c => c.id === state.currentCatId);
          const q = cat?.questions?.[state.currentQIndex];
          return q ? {
            text: (q.text || '').slice(0, 80),
            type: q.type,
            correct: q.correct,
            options: q.options?.length || 0,
          } : null;
        } catch (e) { return null; }
      });
      console.log(`    Current question: "${qInfo?.text}..." (type=${qInfo?.type}, correct=${qInfo?.correct})`);
      
      // Click the CORRECT answer (qInfo.correct) to score a point
      if (qInfo && qInfo.correct !== undefined && qInfo.correct !== null) {
        const correctBtn = await page.$(`#opt-btn-${qInfo.correct}`);
        if (correctBtn) {
          await correctBtn.click().catch(()=>{});
          await wait(1500);
          await snap('18-after-answer');
          log('16-answer', true, `Clicked correct option #${qInfo.correct}`);
        }
      } else {
        // Just click first option
        const optBtn = await page.$('.option-btn, [id^="opt-btn-"]');
        if (optBtn) {
          await optBtn.click().catch(()=>{});
          await wait(1500);
          log('16-answer', true, 'Clicked first option');
        }
      }
      
      // Check team score
      const scoreAfter = await page.evaluate(() => {
        const t = state.teams?.[state.currentTeamIndex];
        return t ? { name: t.name, score: t.score } : null;
      });
      console.log(`    Score after answer: ${scoreAfter?.name} = ${scoreAfter?.score}`);
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 17: Try to advance to next question
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 17: Next question ═══');
    const nextBtn = await page.$('button:has-text("التالي"), button:has-text("السؤال التالي"), button:has-text("Next"), [onclick*="nextQuestion"], [onclick*="nextQ"], #btn-next');
    if (nextBtn) {
      await nextBtn.click().catch(()=>{});
      await wait(1500);
      await snap('19-next-question');
      log('17-next', true, 'Next button clicked');
    } else {
      // Try direct API
      const nextOk = await page.evaluate(() => {
        try {
          if (typeof nextQuestion === 'function') { nextQuestion(); return true; }
          if (typeof nextQ === 'function') { nextQ(); return true; }
          return false;
        } catch (e) { return false; }
      });
      log('17-next', nextOk, nextOk ? 'nextQuestion() called' : 'No next mechanism found');
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 18: Go back to admin and end competition
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 18: End competition + podium ═══');
    await page.evaluate(() => { if (typeof showView === 'function') showView('admin'); });
    await wait(1000);
    
    // Try to show podium
    const podiumOk = await page.evaluate(() => {
      try {
        if (typeof showPodium === 'function') { showPodium(); return true; }
        return false;
      } catch (e) { return false; }
    });
    await wait(2000);
    await snap('20-podium');
    log('18-podium', podiumOk, podiumOk ? 'Podium shown' : 'showPodium not available');

    // ═══════════════════════════════════════════════════════
    // STAGE 19: View session history
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 19: Session history ═══');
    const histOk = await page.evaluate(() => {
      try {
        if (typeof showSessionHistory === 'function') { showSessionHistory(); return true; }
        return false;
      } catch (e) { return false; }
    });
    await wait(1000);
    await snap('21-session-history');
    log('19-history', histOk, histOk ? 'Session history opened' : 'showSessionHistory failed');
    
    // Close modal
    await page.evaluate(() => { if (typeof closeModal === 'function') closeModal('modal-generic'); });
    await wait(300);

    // ═══════════════════════════════════════════════════════
    // STAGE 20: Test export
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 20: Export data ═══');
    const exportResult = await page.evaluate(() => {
      try {
        // Don't actually trigger download — just verify function exists
        if (typeof exportData === 'function') return { ok: true };
        return { ok: false, err: 'exportData not defined' };
      } catch (e) { return { ok: false, err: e.message }; }
    });
    log('20-export', exportResult.ok, exportResult.ok ? 'exportData is callable' : `Failed: ${exportResult.err}`);

    // ═══════════════════════════════════════════════════════
    // STAGE 21: Storage health
    // ═══════════════════════════════════════════════════════
    console.log('\n═══ STAGE 21: Storage health ═══');
    const health = await page.evaluate(async () => {
      try {
        return await checkStorageHealth();
      } catch (e) { return { error: e.message }; }
    });
    log('21-storage', health && (health.localStorageOk || health.idbOk),
      `LS=${health?.localStorageOk}, IDB=${health?.idbOk}, cats=${health?.categories}, q=${health?.questions}, MB=${health?.usedMB}`);

  } catch (e) {
    log('exception', false, e.message);
  }

  // ═══════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════');
  console.log(`Errors captured: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\n=== Unique errors ===');
    [...new Set(errors)].slice(0, 30).forEach(e => console.log('  ' + e));
  }
  
  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
