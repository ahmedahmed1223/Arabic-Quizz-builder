// E2E game flow — SIMPLIFIED version with try/catch around each step.
// Doesn't try to actually play the game (fragile). Just verifies key entry points work.

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
  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  const log = (step, ok, msg) => {
    const icon = ok ? '✓' : '✗';
    console.log(`${icon} [${step}] ${msg}`);
  };

  // ── Step 1: Initial load + wizard ──
  console.log('\n═══ Step 1: Fresh install — wizard ═══');
  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await wait(4500);
    const wizardActive = await page.evaluate(() => {
      const w = document.getElementById('wizard-overlay');
      return w && w.classList.contains('active');
    });
    log('1-wizard', wizardActive, wizardActive ? 'Wizard shown on fresh install' : 'Wizard NOT shown');
  } catch (e) { log('1-wizard', false, e.message); }

  // ── Step 2: Complete wizard quickly by calling finish() directly ──
  console.log('\n═══ Step 2: Complete wizard ═══');
  try {
    // Try clicking next buttons
    let nextClicks = 0;
    for (let i = 0; i < 12; i++) {
      const btn = await page.$('#wiz-next-btn');
      if (!btn) break;
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) break;
      const txt = (await btn.textContent().catch(() => '')).trim();
      await btn.click({ timeout: 1500 }).catch(()=>{});
      nextClicks++;
      await wait(300);
      if (txt.includes('إنهاء') || txt.includes('ابدأ') || txt.includes('Finish')) break;
    }
    log('2-wizard-next', nextClicks > 0, `Clicked Next ${nextClicks} times`);
    await wait(1500);
    
    // Login if needed
    const openBtn = await page.$('[onclick="showLoginPassword"]');
    if (openBtn) {
      await openBtn.click().catch(()=>{});
      await wait(400);
      const pwd = await page.$('#login-password-input');
      if (pwd) {
        await pwd.fill('1234');
        await page.click('[onclick="doLogin()"]').catch(()=>{});
        await wait(1500);
      }
    }
    
    const adminVisible = await page.evaluate(() => {
      const a = document.getElementById('view-admin');
      return a && !a.classList.contains('hidden');
    });
    log('2-admin', adminVisible, adminVisible ? 'Admin panel accessible' : 'Admin NOT accessible');
  } catch (e) { log('2-wizard', false, e.message); }

  // ── Step 3: Check state after wizard ──
  console.log('\n═══ Step 3: Post-wizard state ═══');
  try {
    const s = await page.evaluate(() => ({
      cats: state?.categories?.length || 0,
      teams: state?.teams?.length || 0,
      questions: state?.categories?.reduce((s, c) => s + (c.questions?.length || 0), 0) || 0,
      setupDone: !!localStorage.getItem('quiz_v4_setup_done'),
    }));
    log('3-state', s.setupDone && s.cats > 0, 
      `setup_done=${s.setupDone}, cats=${s.cats}, questions=${s.questions}, teams=${s.teams}`);
  } catch (e) { log('3-state', false, e.message); }

  // ── Step 4: Switch language ──
  console.log('\n═══ Step 4: Switch language ═══');
  try {
    await page.evaluate(() => { if (typeof I18n !== 'undefined') I18n.setLang('en'); });
    await wait(800);
    const en = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));
    log('4-en', en.lang === 'en' && en.dir === 'ltr', `lang=${en.lang} dir=${en.dir}`);
    
    await page.evaluate(() => { if (typeof I18n !== 'undefined') I18n.setLang('ar'); });
    await wait(800);
    const ar = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));
    log('4-ar', ar.lang === 'ar' && ar.dir === 'rtl', `lang=${ar.lang} dir=${ar.dir}`);
  } catch (e) { log('4-lang', false, e.message); }

  // ── Step 5: Switch theme ──
  console.log('\n═══ Step 5: Switch theme ═══');
  try {
    const result = await page.evaluate(() => {
      try {
        applyTheme('gold', false);
        return { ok: true, theme: state.settings.theme };
      } catch (e) { return { ok: false, err: e.message }; }
    });
    log('5-theme', result.ok && result.theme === 'gold', 
      result.ok ? `Theme=${result.theme}` : `Failed: ${result.err}`);
  } catch (e) { log('5-theme', false, e.message); }

  // ── Step 6: Verify key global functions exist ──
  console.log('\n═══ Step 6: Verify globals ═══');
  try {
    const fns = await page.evaluate(() => ({
      exportData: typeof exportData,
      exportDataZip: typeof exportDataZip,
      importJSON: typeof importJSON,
      saveState: typeof saveState,
      loadQuestion: typeof loadQuestion,
      startCompetition: typeof startCompetition,
      showView: typeof showView,
      switchTab: typeof switchTab,
      Wizard: typeof Wizard,
      applyTheme: typeof applyTheme,
      I18n: typeof I18n,
      MediaDB: typeof MediaDB,
      SoloMode: typeof SoloMode,
    }));
    const missing = Object.entries(fns).filter(([k,v]) => v === 'undefined').map(([k]) => k);
    log('6-globals', missing.length === 0, 
      missing.length === 0 ? 'All key globals defined' : `Missing: ${missing.join(', ')}`);
  } catch (e) { log('6-globals', false, e.message); }

  // ── Step 7: Navigate admin tabs ──
  console.log('\n═══ Step 7: Navigate admin tabs ═══');
  const tabs = ['settings', 'appearance', 'categories', 'teams', 'import', 'help'];
  let tabFailures = 0;
  for (const tab of tabs) {
    try {
      await page.evaluate((t) => switchTab(t), tab);
      await wait(400);
      const visible = await page.evaluate((t) => {
        const el = document.getElementById('tab-' + t);
        return el && !el.classList.contains('hidden');
      }, tab);
      if (!visible) tabFailures++;
    } catch (e) {
      tabFailures++;
      errors.push(`[tab:${tab}] ${e.message}`);
    }
  }
  log('7-tabs', tabFailures === 0, `${tabs.length - tabFailures}/${tabs.length} tabs navigated successfully`);

  // ── Step 8: Open question modal ──
  console.log('\n═══ Step 8: Open question editor ═══');
  try {
    await page.evaluate(() => switchTab('categories'));
    await wait(600);
    // Try clicking "add question" if any category exists
    const added = await page.evaluate(() => {
      // Just check that categories rendered without throwing
      const list = document.getElementById('categories-list-admin');
      return list && (list.children.length > 0 || state.categories.length === 0);
    });
    log('8-categories', added, 'Categories tab rendered');
  } catch (e) { log('8-categories', false, e.message); }

  // ── Step 9: Storage health check ──
  console.log('\n═══ Step 9: Storage health ═══');
  try {
    const health = await page.evaluate(async () => {
      try {
        return await checkStorageHealth();
      } catch (e) { return { error: e.message }; }
    });
    log('9-storage', health && (health.localStorageOk || health.idbOk), 
      `LS=${health?.localStorageOk}, IDB=${health?.idbOk}, cats=${health?.categories}, q=${health?.questions}`);
  } catch (e) { log('9-storage', false, e.message); }

  // ── Final ──
  console.log('\n═══════════════════════════════════════════');
  console.log(`Errors captured: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\n=== Errors (deduplicated) ===');
    [...new Set(errors)].slice(0, 25).forEach(e => console.log('  ' + e));
  }
  
  try { await page.screenshot({ path: '/home/z/my-project/screenshots/e2e-final.png' }); } catch {}
  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
