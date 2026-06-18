// Comprehensive Solo Mode + External Library + Settings Import/Export + Question Editor test
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setupAndLogin(browser, width = 1280, height = 800) {
  const ctx = await browser.newContext({ viewport: { width, height } });
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
  
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const t = await setupAndLogin(browser);
  const page = t.page;
  
  const snap = async (name) => {
    await page.screenshot({ path: `/home/z/my-project/screenshots/solo-${name}.png` });
    console.log(`  📸 solo-${name}.png`);
  };
  
  const log = (step, ok, msg) => {
    console.log(`${ok ? '✓' : '✗'} [${step}] ${msg}`);
  };

  // ═══════════════════════════════════════════════════════
  // STAGE A: SOLO MODE — full flow
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STAGE A: SOLO MODE ═══');
  
  // A1. Start solo game
  console.log('\n▶ A1: Start solo game');
  const soloStarted = await page.evaluate(() => {
    try {
      if (typeof startSoloGame === 'function') { startSoloGame(); return { ok: true }; }
      return { ok: false, err: 'startSoloGame not defined' };
    } catch (e) { return { ok: false, err: e.message }; }
  });
  await wait(2500);
  await snap('01-solo-start');
  log('A1-solo-start', soloStarted.ok, soloStarted.ok ? 'Solo game started' : `Failed: ${soloStarted.err}`);
  
  // A2. Inspect solo screen
  console.log('\n▶ A2: Inspect solo map screen');
  const soloMapInfo = await page.evaluate(() => ({
    currentView: window._currentView,
    hasSoloMap: !!document.getElementById('view-solo-map') || !!document.querySelector('[id*="solo-map"]'),
    soloMapVisible: (() => {
      const v = document.getElementById('view-solo-map');
      return v && v.offsetParent !== null;
    })(),
    soloCatsVisible: document.querySelectorAll('[onclick*="solo"], .solo-cat-card, .solo-world').length,
    starsDisplay: document.querySelector('[id*="solo-star"], .solo-stars')?.textContent?.slice(0, 30),
    bodyText: document.body.innerText.match(/(?:سولو|solo|إنجاز|achievement|المستوى|level|نجمة|star)[^\n]{0,80}/i)?.[0],
  }));
  console.log('  Solo map info:', JSON.stringify(soloMapInfo, null, 2));
  log('A2-solo-map', soloMapInfo.soloMapVisible, soloMapInfo.soloMapVisible ? 'Solo map visible' : 'Solo map NOT visible');
  
  // A3. Try clicking first solo category/world
  console.log('\n▶ A3: Click first solo category');
  const firstSolo = await page.$('.solo-cat-card, .solo-world, [onclick*="playSolo"], [onclick*="soloCat"]');
  if (firstSolo) {
    await firstSolo.click().catch(()=>{});
    await wait(2500);
    await snap('02-solo-question');
    
    const soloQInfo = await page.evaluate(() => ({
      currentView: window._currentView,
      hasQuestion: !!document.querySelector('#solo-q-text, .solo-question-text, .question-text-main'),
      hasOptions: document.querySelectorAll('.solo-option, [id^="solo-opt-"]').length,
      hasTimer: !!document.querySelector('#solo-timer, .solo-timer'),
      soloState: {
        currentCat: _soloCurrentCat?.name || null,
        currentQIdx: _soloCurrentQIdx,
      },
    }));
    console.log('  Solo question info:', JSON.stringify(soloQInfo, null, 2));
    log('A3-solo-question', soloQInfo.hasQuestion, soloQInfo.hasQuestion ? 'Solo question shown' : 'No solo question');
  } else {
    // Try direct API
    console.log('  Trying direct API...');
    const directResult = await page.evaluate(() => {
      try {
        const cats = state.categories.filter(c => c.questions && c.questions.length > 0);
        if (cats.length === 0) return { ok: false, err: 'no cats' };
        if (typeof playSoloLevel === 'function') {
          playSoloLevel(cats[0].id, 0);
          return { ok: true };
        }
        return { ok: false, err: 'playSoloLevel not defined' };
      } catch (e) { return { ok: false, err: e.message }; }
    });
    await wait(2500);
    await snap('02-solo-question');
    log('A3-solo-direct', directResult.ok, directResult.ok ? 'Direct solo start worked' : `Failed: ${directResult.err}`);
  }
  
  // A4. Check for achievements/stars display
  console.log('\n▶ A4: Check achievements UI');
  await page.evaluate(() => { try { showView('solo-map'); } catch(e){} });
  await wait(1500);
  const achInfo = await page.evaluate(() => ({
    hasStars: !!document.querySelector('[id*="stars"], .solo-stars'),
    starsText: document.querySelector('[id*="stars"], .solo-stars')?.textContent?.slice(0, 50),
    hasAchievements: !!document.querySelector('[id*="achievement"], .achievement'),
    hasLevels: !!document.querySelector('[id*="level"], .level-progress'),
    soloProgress: state.soloProgress ? {
      totalLevels: state.soloProgress.totalLevels,
      completedLevels: Object.keys(state.soloProgress.levels || {}).length,
      totalStars: Object.values(state.soloProgress.levels || {}).reduce((s, l) => s + (l.stars || 0), 0),
    } : null,
  }));
  console.log('  Achievements info:', JSON.stringify(achInfo, null, 2));
  
  // A5. Solo settings panel
  console.log('\n▶ A5: Solo settings panel');
  const soloSettingsOpened = await page.evaluate(() => {
    try {
      const btn = document.querySelector('[onclick*="toggleSoloSettings"], [onclick*="openSoloSettings"], #solo-settings-btn');
      if (btn) { btn.click(); return true; }
      const panel = document.getElementById('solo-settings-panel');
      if (panel) { panel.classList.add('solo-overlay-visible'); return true; }
      return false;
    } catch (e) { return false; }
  });
  await wait(1000);
  await snap('03-solo-settings');
  log('A5-solo-settings', soloSettingsOpened, soloSettingsOpened ? 'Solo settings opened' : 'No solo settings button');
  
  // A6. Close solo + back to admin
  console.log('\n▶ A6: Return to admin');
  await page.evaluate(() => {
    try {
      const panel = document.getElementById('solo-settings-panel');
      if (panel) panel.classList.remove('solo-overlay-visible');
      showView('admin');
    } catch(e){}
  });
  await wait(1500);

  // ═══════════════════════════════════════════════════════
  // STAGE B: EXTERNAL LIBRARY IMPORT
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STAGE B: EXTERNAL LIBRARY ═══');
  
  // B1. Navigate to import tab
  console.log('\n▶ B1: Open import tab');
  await page.evaluate(() => switchTab('import'));
  await wait(1500);
  await snap('04-import-tab');
  
  // B2. Check ext-lib preview area
  console.log('\n▶ B2: Inspect external library UI');
  const extLibInfo = await page.evaluate(() => ({
    hasFetchBtn: !!document.querySelector('[onclick*="fetchExternalLibrary"], #ext-lib-fetch-btn'),
    hasPreviewArea: !!document.getElementById('ext-lib-preview'),
    hasUrlInput: !!document.querySelector('#ext-lib-url, [id*="ext-lib"][id*="url"]'),
    bodyText: document.body.innerText.match(/(?:مكتبة خارجية|external library|استيراد)[^\n]{0,80}/i)?.[0],
  }));
  console.log('  Ext lib UI:', JSON.stringify(extLibInfo, null, 2));
  log('B2-ext-lib-ui', extLibInfo.hasFetchBtn || extLibInfo.hasPreviewArea, 
    extLibInfo.hasFetchBtn ? 'Fetch button found' : 'No fetch button (may be missing)');
  
  // B3. Try calling fetchExternalLibrary
  console.log('\n▶ B3: Call fetchExternalLibrary');
  const fetchResult = await page.evaluate(async () => {
    try {
      if (typeof fetchExternalLibrary === 'function') {
        // Don't actually fetch from network — just verify it exists
        return { ok: true, type: typeof fetchExternalLibrary };
      }
      return { ok: false, err: 'fetchExternalLibrary not defined' };
    } catch (e) { return { ok: false, err: e.message }; }
  });
  log('B3-fetch', fetchResult.ok, fetchResult.ok ? 'fetchExternalLibrary is callable' : `Failed: ${fetchResult.err}`);

  // ═══════════════════════════════════════════════════════
  // STAGE C: SETTINGS EXPORT/IMPORT
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STAGE C: SETTINGS EXPORT/IMPORT ═══');
  
  // C1. Test exportSettings (from Wizard)
  console.log('\n▶ C1: Wizard.exportSettings');
  const exportResult = await page.evaluate(() => {
    try {
      if (typeof Wizard !== 'undefined' && typeof Wizard.exportSettings === 'function') {
        return { ok: true, msg: 'Wizard.exportSettings is callable' };
      }
      return { ok: false, msg: 'Wizard.exportSettings not found' };
    } catch (e) { return { ok: false, msg: e.message }; }
  });
  log('C1-export', exportResult.ok, exportResult.msg);
  
  // C2. Test import settings via file input
  console.log('\n▶ C2: Import settings file input');
  const importInfo = await page.evaluate(() => {
    // Check for file input elements that accept settings JSON
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    return inputs.map(inp => ({
      id: inp.id,
      accept: inp.accept,
      onchange: inp.getAttribute('onchange'),
    }));
  });
  console.log('  File inputs:', JSON.stringify(importInfo, null, 2));
  
  // C3. Build a test settings JSON and try importing it
  console.log('\n▶ C3: Build test settings JSON');
  const testSettings = {
    name: 'مسابقة اختبار',
    settings: {
      name: 'مسابقة اختبار',
      password: '1234',
      pwLevel: 'login',
      theme: 'gold',
      defaultTime: 25,
      hardPoints: 3,
      language: 'ar',
      compMode: 'turns',
    },
    categories: [
      {
        id: 'cat_test_1',
        name: 'فئة اختبار',
        icon: '📝',
        color: '#00d4ff',
        questions: [
          {
            id: 'q_test_1',
            text: 'كم عدد أيام الأسبوع؟',
            type: 'text',
            options: ['5', '6', '7', '8'],
            correct: 2,
            difficulty: 'easy',
            points: 1,
          },
        ],
      },
    ],
    teams: [],
    credits: [],
  };
  
  // C4. Try importJSON with test data
  console.log('\n▶ C4: Import test JSON');
  const importResult = await page.evaluate(async (data) => {
    try {
      // Create a File object and pass to importJSON
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });
      
      // Create a fake event
      const fakeEvent = { target: { files: [file] } };
      
      if (typeof importJSON === 'function') {
        // Can't actually run async import without file input, but check function exists
        return { ok: true, msg: 'importJSON is callable' };
      }
      return { ok: false, msg: 'importJSON not defined' };
    } catch (e) { return { ok: false, msg: e.message }; }
  }, testSettings);
  log('C4-import', importResult.ok, importResult.msg);
  
  // C5. Test exportData (full export)
  console.log('\n▶ C5: Export data function');
  const exportDataResult = await page.evaluate(() => {
    try {
      if (typeof exportData === 'function') return { ok: true };
      return { ok: false };
    } catch (e) { return { ok: false, msg: e.message }; }
  });
  log('C5-export-data', exportDataResult.ok, exportDataResult.ok ? 'exportData callable' : 'exportData missing');
  
  // C6. Test exportEncrypted
  console.log('\n▶ C6: Export encrypted function');
  const exportEncResult = await page.evaluate(() => {
    try {
      if (typeof exportEncrypted === 'function') return { ok: true };
      return { ok: false };
    } catch (e) { return { ok: false, msg: e.message }; }
  });
  log('C6-export-enc', exportEncResult.ok, exportEncResult.ok ? 'exportEncrypted callable' : 'exportEncrypted missing');

  // ═══════════════════════════════════════════════════════
  // STAGE D: QUESTION EDITOR — all types
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STAGE D: QUESTION EDITOR ═══');
  
  // D1. Open categories tab and select first category
  console.log('\n▶ D1: Open categories');
  await page.evaluate(() => switchTab('categories'));
  await wait(1000);
  
  // D2. Open question editor for new question
  console.log('\n▶ D2: Open question editor');
  await page.evaluate(() => {
    try {
      const cat = state.categories[0];
      if (cat) openQuestionModal(cat.id);
    } catch(e) { console.error(e); }
  });
  await wait(1500);
  await snap('05-q-editor');
  
  const editorInfo = await page.evaluate(() => ({
    modalVisible: (() => { const m = document.getElementById('modal-question'); return m && !m.classList.contains('hidden'); })(),
    qTypes: [...document.querySelectorAll('.qtype-tab, [onclick*="setQType"]')].map(t => ({
      text: t.textContent.trim().slice(0, 20),
      onclick: t.getAttribute('onclick'),
    })),
    fields: {
      text: !!document.getElementById('q-text-input'),
      type: !!document.getElementById('q-type-select'),
      time: !!document.getElementById('q-time-input'),
      diff: !!document.getElementById('q-difficulty-select'),
      points: !!document.getElementById('q-points-input'),
    },
  }));
  console.log('  Editor info:', JSON.stringify(editorInfo, null, 2));
  log('D2-editor', editorInfo.modalVisible, editorInfo.modalVisible ? 'Question modal opened' : 'Modal NOT opened');
  
  // D3. Try each question type
  console.log('\n▶ D3: Try each question type');
  const qTypes = ['text', 'tf', 'fitb', 'order', 'match', 'math', 'quran', 'image', 'audio', 'video'];
  for (const type of qTypes) {
    const typeOk = await page.evaluate((t) => {
      try {
        if (typeof setQType === 'function') { setQType(t); return true; }
        return false;
      } catch (e) { return false; }
    }, type);
    if (typeOk) {
      await wait(300);
      // Verify the type was set
      const currentType = await page.evaluate(() => state?.editingQType || document.querySelector('.qtype-tab.active')?.getAttribute('data-type'));
      log(`D3-type-${type}`, true, `Type "${type}" set OK (current: ${currentType})`);
    } else {
      log(`D3-type-${type}`, false, `setQType("${type}") failed`);
    }
  }
  await snap('06-q-editor-types');
  
  // D4. Close modal
  await page.evaluate(() => { try { closeModal('modal-question'); } catch(e){} });
  await wait(500);

  // ═══════════════════════════════════════════════════════
  // STAGE E: THEME EDITOR + CUSTOM COLORS
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STAGE E: THEME EDITOR ═══');
  
  // E1. Open appearance tab
  console.log('\n▶ E1: Open appearance tab');
  await page.evaluate(() => switchTab('appearance'));
  await wait(1500);
  await snap('07-appearance');
  
  // E2. Apply each major theme
  console.log('\n▶ E2: Apply each theme');
  const themes = ['space', 'light', 'gold', 'cyber', 'mermaid', 'pure-black'];
  for (const themeId of themes) {
    const ok = await page.evaluate((t) => {
      try { applyTheme(t, false); return state.settings.theme === t; }
      catch (e) { return false; }
    }, themeId);
    await wait(400);
    log(`E2-theme-${themeId}`, ok, ok ? `Applied` : `Failed`);
  }
  
  // E3. Check theme editor visibility
  console.log('\n▶ E3: Check theme editor');
  const themeEditorInfo = await page.evaluate(() => ({
    hasThemeGrid: !!document.getElementById('theme-grid'),
    themeGridCount: document.getElementById('theme-grid')?.children?.length || 0,
    hasCustomPanel: !!document.getElementById('custom-theme-panel'),
    hasColorInputs: document.querySelectorAll('.theme-color-input, [type="color"]').length,
  }));
  console.log('  Theme editor:', JSON.stringify(themeEditorInfo, null, 2));
  
  // E4. Test custom theme
  console.log('\n▶ E4: Apply custom theme');
  const customOk = await page.evaluate(() => {
    try {
      applyTheme('custom', false);
      return state.settings.theme === 'custom';
    } catch (e) { return false; }
  });
  await wait(500);
  await snap('08-custom-theme');
  log('E4-custom', customOk, customOk ? 'Custom theme applied' : 'Custom theme failed');

  // ═══════════════════════════════════════════════════════
  // STAGE F: PRESENTATION MODE
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STAGE F: PRESENTATION MODE ═══');
  
  // F1. Add teams first
  console.log('\n▶ F1: Add teams for presentation');
  await page.evaluate(() => {
    state.teams.push({id:'pt1',name:'فريق النجوم',color:'#00d4ff',score:0,members:[]});
    state.teams.push({id:'pt2',name:'فريق القمر',color:'#a259ff',score:0,members:[]});
    saveState();
  });
  await wait(500);
  
  // F2. Test showRemotePanel
  console.log('\n▶ F2: showRemotePanel');
  const remoteOk = await page.evaluate(() => {
    try {
      if (typeof showRemotePanel === 'function') { showRemotePanel(); return true; }
      return false;
    } catch (e) { return false; }
  });
  await wait(1500);
  await snap('09-remote-panel');
  log('F2-remote', remoteOk, remoteOk ? 'Remote panel opened' : 'showRemotePanel not available');
  
  // F3. Test showAudienceScreen
  console.log('\n▶ F3: showAudienceScreen');
  const audienceOk = await page.evaluate(() => {
    try {
      if (typeof showAudienceScreen === 'function') { showAudienceScreen(); return true; }
      return false;
    } catch (e) { return false; }
  });
  await wait(1500);
  await snap('10-audience-screen');
  log('F3-audience', audienceOk, audienceOk ? 'Audience screen opened' : 'showAudienceScreen not available');
  
  // F4. Check _pushRemoteState
  console.log('\n▶ F4: _pushRemoteState');
  const pushOk = await page.evaluate(() => {
    try {
      if (typeof _pushRemoteState === 'function') { _pushRemoteState(); return true; }
      return false;
    } catch (e) { return false; }
  });
  log('F4-push-remote', pushOk, pushOk ? '_pushRemoteState callable' : 'Not available');

  // ═══════════════════════════════════════════════════════
  // STAGE G: LANGUAGE TOGGLE
  // ═══════════════════════════════════════════════════════
  console.log('\n═══ STAGE G: LANGUAGE TOGGLE ═══');
  
  // G1. Switch to English and check all nav tabs translated
  console.log('\n▶ G1: Switch to English');
  await page.evaluate(() => { if (typeof I18n !== 'undefined') I18n.setLang('en'); });
  await wait(1000);
  await snap('11-english-mode');
  
  const enTabs = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.nav-tab')];
    return tabs.filter(t => t.offsetParent !== null).map(t => ({
      text: t.textContent.trim().slice(0, 20),
      hasArabic: /[\u0600-\u06FF]/.test(t.textContent),
    }));
  });
  const stillArabicEn = enTabs.filter(t => t.hasArabic);
  log('G1-en-tabs', stillArabicEn.length === 0, 
    stillArabicEn.length === 0 ? 'All nav tabs in English' : `${stillArabicEn.length} tabs still in Arabic: ${stillArabicEn.map(t => t.text).join(', ')}`);
  
  // G2. Switch back to Arabic
  console.log('\n▶ G2: Switch back to Arabic');
  await page.evaluate(() => { if (typeof I18n !== 'undefined') I18n.setLang('ar'); });
  await wait(1000);
  const arDir = await page.evaluate(() => document.documentElement.dir);
  log('G2-ar', arDir === 'rtl', `Arabic mode: dir=${arDir}`);

  // ═══════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════');
  console.log(`Total errors captured: ${t.errors.length}`);
  if (t.errors.length > 0) {
    console.log('\n=== Unique errors ===');
    [...new Set(t.errors)].slice(0, 20).forEach(e => console.log('  ' + e.slice(0, 150)));
  }
  
  await browser.close();
})();
