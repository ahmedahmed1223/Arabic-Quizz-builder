// Inspect scores and podium screens for real issues
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
  
  // Add teams with scores (simulate finished game)
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:7,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:5,members:[]});
    state.teams.push({id:'t3',name:'فريق الشمس',color:'#f5c842',score:3,members:[]});
    state.gameActive = false;
    saveState();
  });
  await wait(1000);
  
  // ══ SCORES SCREEN ══
  console.log('\n═══ SCORES SCREEN ═══');
  await page.evaluate(() => showView('scores'));
  await wait(2000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/inspect-scores.png' });
  
  const scoresInfo = await page.evaluate(() => {
    const view = document.getElementById('view-scores');
    if (!view) return { error: 'no view-scores' };
    const els = [...view.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && el.id;
    }).map(el => ({
      id: el.id,
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 60),
      rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width) },
    }));
    return {
      visible: view.offsetParent !== null,
      hasVerticalScroll: view.scrollHeight > view.clientHeight,
      scrollH: view.scrollHeight,
      clientH: view.clientHeight,
      elements: els.slice(0, 15),
    };
  });
  console.log(JSON.stringify(scoresInfo, null, 2));
  
  // ══ PODIUM ══
  console.log('\n═══ PODIUM ═══');
  await page.evaluate(() => { try { showPodium(); } catch(e){console.error(e);} });
  await wait(3000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/inspect-podium.png' });
  
  const podiumInfo = await page.evaluate(() => {
    // Find the podium modal/overlay
    const podiumModal = document.getElementById('modal-podium') || document.getElementById('podium-overlay');
    const genericModal = document.getElementById('modal-generic');
    const activeModal = podiumModal || genericModal;
    if (!activeModal) return { error: 'no podium modal found' };
    
    const visible = activeModal.offsetParent !== null && !activeModal.classList.contains('hidden');
    const els = [...activeModal.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).map(el => ({
      tag: el.tagName,
      id: el.id || '',
      cls: String(el.className || '').slice(0, 30),
      text: el.textContent?.trim().slice(0, 40),
    }));
    return {
      modalId: activeModal.id,
      visible,
      elementsCount: els.length,
      elements: els.slice(0, 20),
    };
  });
  console.log(JSON.stringify(podiumInfo, null, 2));
  
  // ══ CERTIFICATE ══
  console.log('\n═══ CERTIFICATE ═══');
  await page.evaluate(() => { try { closeModal('modal-generic'); closeModal('modal-podium'); } catch(e){} });
  await wait(500);
  // Try generating certificate
  const certResult = await page.evaluate(() => {
    try {
      if (typeof generateCertificate === 'function') { generateCertificate(); return { ok: true, fn: 'generateCertificate' }; }
      if (typeof showCertificate === 'function') { showCertificate(); return { ok: true, fn: 'showCertificate' }; }
      if (typeof openCertificateModal === 'function') { openCertificateModal(); return { ok: true, fn: 'openCertificateModal' }; }
      return { ok: false };
    } catch (e) { return { ok: false, err: e.message }; }
  });
  console.log('Certificate:', JSON.stringify(certResult));
  await wait(2000);
  await page.screenshot({ path: '/home/z/my-project/screenshots/inspect-certificate.png' });
  
  await browser.close();
})();
