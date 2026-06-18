// Inspect the question screen DOM for real UI issues
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
  
  // Wizard + login + teams
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
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    saveState();
  });
  await wait(1000);
  
  // Start competition + select first category
  await page.evaluate(() => showView('intro'));
  await wait(1000);
  await page.evaluate(() => startCompetition());
  await wait(2000);
  await page.evaluate(() => {
    const cards = document.querySelectorAll('#cats-pres-grid > div');
    if (cards.length > 0) cards[0].click();
  });
  await wait(2500);
  
  // ── Inspect QUESTION SCREEN for real UI issues ──
  console.log('\n═══ QUESTION SCREEN INSPECTION ═══');
  const qScreenIssues = await page.evaluate(() => {
    const issues = [];
    
    // 1. Check question text visibility
    const qText = document.querySelector('.question-text-main, #q-text-main');
    if (qText) {
      const r = qText.getBoundingClientRect();
      const cs = getComputedStyle(qText);
      issues.push({
        check: 'question-text',
        visible: r.width > 0 && r.height > 0,
        fontSize: cs.fontSize,
        color: cs.color,
        text: qText.textContent?.slice(0, 80),
        inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
      });
    }
    
    // 2. Check team indicator
    const teamEl = document.querySelector('#q-team-name, .current-team-display, [class*="team-name"]');
    if (teamEl) {
      issues.push({
        check: 'team-indicator',
        visible: teamEl.getBoundingClientRect().width > 0,
        text: teamEl.textContent?.slice(0, 40),
      });
    } else {
      issues.push({ check: 'team-indicator', visible: false, note: 'No team indicator element found' });
    }
    
    // 3. Check timer
    const timerEl = document.querySelector('#q-timer, .timer-display, #timer-display');
    if (timerEl) {
      issues.push({
        check: 'timer',
        visible: timerEl.getBoundingClientRect().width > 0,
        text: timerEl.textContent?.slice(0, 20),
      });
    } else {
      issues.push({ check: 'timer', visible: false, note: 'No timer element found' });
    }
    
    // 4. Check option buttons / input fields
    const optBtns = document.querySelectorAll('.option-btn, [id^="opt-btn-"]');
    const fitbInput = document.querySelector('#fitb-player-input, input[type="text"][id*="fitb"]');
    issues.push({
      check: 'answer-input',
      optionButtons: optBtns.length,
      fitbInput: !!fitbInput,
      fitbInputVisible: fitbInput ? fitbInput.getBoundingClientRect().width > 0 : false,
    });
    
    // 5. Check action buttons (reveal, next, lifelines)
    const actionBtns = [...document.querySelectorAll('button')].filter(b => {
      const t = b.textContent.trim();
      const cs = getComputedStyle(b);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && b.offsetParent !== null
        && (t.includes('تخطي') || t.includes('كشف') || t.includes('50') || t.includes('التالي') 
            || t.includes('تأكيد') || t.includes('تلميح') || t.includes('حذف'));
    }).map(b => ({ text: b.textContent.trim().slice(0, 20), classes: b.className.slice(0, 40) }));
    issues.push({ check: 'action-buttons', buttons: actionBtns });
    
    // 6. Check score display
    const scoreEls = document.querySelectorAll('[id*="score"], .team-score, .score-display');
    const scoreInfo = [...scoreEls].filter(el => el.offsetParent !== null).map(el => ({
      id: el.id, text: el.textContent.trim().slice(0, 30)
    }));
    issues.push({ check: 'score-display', elements: scoreInfo });
    
    // 7. Check for overflow / clipping
    const body = document.body;
    const html = document.documentElement;
    issues.push({
      check: 'overflow',
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
      hasVerticalScroll: body.scrollHeight > body.clientHeight,
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      hasHorizontalScroll: html.scrollWidth > html.clientWidth,
    });
    
    return issues;
  });
  
  qScreenIssues.forEach(i => console.log(JSON.stringify(i, null, 2)));
  
  // Take a focused screenshot
  await page.screenshot({ path: '/home/z/my-project/screenshots/inspect-question.png' });
  
  // ── Check for elements OFF-SCREEN (clipped) ──
  console.log('\n═══ OFF-SCREEN ELEMENTS CHECK ═══');
  const offscreen = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const problematic = [];
    document.querySelectorAll('button, [onclick], .option-btn, .cat-pres-btn').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      
      // Check if significantly off-screen
      if (r.right > vw + 50 || r.left < -50 || r.bottom > vh + 200 || r.top < -100) {
        problematic.push({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 30),
          right: Math.round(r.right),
          left: Math.round(r.left),
          bottom: Math.round(r.bottom),
          top: Math.round(r.top),
          viewport: `${vw}x${vh}`,
        });
      }
    });
    return problematic.slice(0, 10);
  });
  console.log('Off-screen elements:', offscreen.length === 0 ? 'NONE ✓' : JSON.stringify(offscreen, null, 2));
  
  await browser.close();
})();
