// Test the wizard properly via UI clicks — find and click the right buttons
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
  
  // Take screenshot of wizard step 1
  await page.screenshot({ path: '/home/z/my-project/screenshots/wizard-step1.png' });
  
  // Get info about wizard buttons
  const wizardInfo = await page.evaluate(() => {
    const overlay = document.getElementById('wizard-overlay');
    const isActive = overlay && overlay.classList.contains('active');
    const currentStep = document.querySelector('.wiz-step.active, .wiz-step:not(.hidden)');
    const nextBtn = document.getElementById('wiz-btn-next');
    const startBtn = document.getElementById('wiz-start-btn');
    const setupOpts = [...document.querySelectorAll('.wiz-setup-opt')].map(o => ({
      mode: o.dataset.mode,
      selected: o.classList.contains('selected'),
      visible: getComputedStyle(o).display !== 'none'
    }));
    return {
      isActive,
      currentStepVisible: currentStep ? currentStep.dataset.step : null,
      nextBtnVisible: nextBtn ? getComputedStyle(nextBtn).display !== 'none' : false,
      nextBtnText: nextBtn ? nextBtn.textContent.trim() : null,
      startBtnVisible: startBtn ? getComputedStyle(startBtn).display !== 'none' : false,
      startBtnText: startBtn ? startBtn.textContent.trim() : null,
      setupOpts,
      currentStep: typeof Wizard !== 'undefined' ? 'defined' : 'undefined',
    };
  });
  console.log('=== Wizard state ===');
  console.log(JSON.stringify(wizardInfo, null, 2));
  
  // Select quick mode + click next
  await page.evaluate(() => {
    if (typeof Wizard !== 'undefined') {
      Wizard.setSetupMode('quick');
      Wizard.selectMode('turns');
    }
  });
  await page.waitForTimeout(300);
  
  // Click next 3 times (quick mode: 1→2→3→7)
  for (let i = 0; i < 3; i++) {
    const nextBtn = await page.$('#wiz-btn-next');
    if (!nextBtn) break;
    const visible = await nextBtn.isVisible().catch(() => false);
    if (!visible) break;
    const txt = await nextBtn.textContent();
    console.log(`Clicking Next (text="${txt.trim()}")...`);
    await nextBtn.click({ timeout: 2000 }).catch((e)=>console.log('click err:', e.message));
    await page.waitForTimeout(500);
  }
  
  // Take screenshot of wizard step 7
  await page.screenshot({ path: '/home/z/my-project/screenshots/wizard-step7.png' });
  
  // Get info again
  const wizardInfo2 = await page.evaluate(() => ({
    nextBtnVisible: (() => { const b = document.getElementById('wiz-btn-next'); return b ? getComputedStyle(b).display !== 'none' : false; })(),
    startBtnVisible: (() => { const b = document.getElementById('wiz-start-btn'); return b ? getComputedStyle(b).display !== 'none' : false; })(),
    startBtnText: document.getElementById('wiz-start-btn')?.textContent?.trim(),
    currentStep: document.querySelector('.wiz-step:not(.hidden)')?.dataset.step,
    passwordFields: !!document.getElementById('wiz-password'),
    passwordVisible: (() => { const p = document.getElementById('wiz-password'); return p ? getComputedStyle(p.closest('.form-group') || p).display !== 'none' : false; })(),
  }));
  console.log('\n=== After 3 Next clicks ===');
  console.log(JSON.stringify(wizardInfo2, null, 2));
  
  // If password field visible, fill it
  if (wizardInfo2.passwordVisible) {
    console.log('Filling password fields...');
    await page.fill('#wiz-password', '1234').catch(()=>{});
    await page.fill('#wiz-password2', '1234').catch(()=>{});
    await page.waitForTimeout(200);
  }
  
  // Click start button
  const startBtn = await page.$('#wiz-start-btn');
  if (startBtn) {
    const visible = await startBtn.isVisible().catch(() => false);
    console.log(`Start button visible: ${visible}`);
    if (visible) {
      console.log('Clicking Start button...');
      await startBtn.click({ timeout: 3000 }).catch((e)=>console.log('start click err:', e.message));
      await page.waitForTimeout(2000);
    }
  }
  
  // Final state
  const finalState = await page.evaluate(() => ({
    setupDone: !!localStorage.getItem('quiz_v4_setup_done'),
    catsCount: state?.categories?.length || 0,
    questionsCount: state?.categories?.reduce((s, c) => s + (c.questions?.length || 0), 0) || 0,
    currentView: window._currentView,
    wizardActive: document.getElementById('wizard-overlay')?.classList.contains('active'),
  }));
  console.log('\n=== After wizard finish ===');
  console.log(JSON.stringify(finalState, null, 2));
  
  await page.screenshot({ path: '/home/z/my-project/screenshots/wizard-final.png' });
  
  await browser.close();
})();
