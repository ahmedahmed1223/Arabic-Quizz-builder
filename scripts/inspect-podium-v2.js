// Inspect podium view + check for visual issues
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
  
  // Add 3 teams with scores
  await page.evaluate(() => {
    state.teams.push({id:'t1',name:'فريق النجوم',color:'#00d4ff',score:7,members:[]});
    state.teams.push({id:'t2',name:'فريق القمر',color:'#a259ff',score:5,members:[]});
    state.teams.push({id:'t3',name:'فريق الشمس',color:'#f5c842',score:3,members:[]});
    state.gameActive = false;
    saveState();
  });
  await wait(1000);
  
  // Call showPodium
  console.log('▶ Calling showPodium()');
  await page.evaluate(() => { try { showPodium(); } catch(e){console.error('showPodium error:', e);} });
  await wait(3000);
  
  // Check state
  const podiumState = await page.evaluate(() => ({
    currentView: window._currentView,
    podiumViewVisible: (() => { const v = document.getElementById('view-podium'); return v && v.offsetParent !== null; })(),
    podiumStage: document.getElementById('podium-stage')?.children?.length || 0,
    podiumRest: document.getElementById('podium-rest')?.children?.length || 0,
    podiumTitle: document.getElementById('podium-title')?.textContent,
  }));
  console.log('Podium state:', JSON.stringify(podiumState, null, 2));
  
  await page.screenshot({ path: '/home/z/my-project/screenshots/inspect-podium-v2.png' });
  
  // Check for off-screen elements in podium
  const offscreen = await page.evaluate(() => {
    const view = document.getElementById('view-podium');
    if (!view) return [];
    const vw = window.innerWidth, vh = window.innerHeight;
    const problematic = [];
    view.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 50 || r.left < -50 || r.bottom > vh + 200 || r.top < -100) {
        problematic.push({
          tag: el.tagName,
          id: el.id,
          cls: String(el.className || '').slice(0, 30),
          text: el.textContent?.trim().slice(0, 30),
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        });
      }
    });
    return problematic.slice(0, 10);
  });
  console.log('\nOff-screen elements in podium:', offscreen.length === 0 ? 'NONE ✓' : JSON.stringify(offscreen, null, 2));
  
  // Check overflow
  const overflow = await page.evaluate(() => {
    const view = document.getElementById('view-podium');
    if (!view) return null;
    return {
      scrollH: view.scrollHeight,
      clientH: view.clientHeight,
      hasVerticalScroll: view.scrollHeight > view.clientHeight,
      scrollW: view.scrollWidth,
      clientW: view.clientWidth,
      hasHorizontalScroll: view.scrollWidth > view.clientWidth,
    };
  });
  console.log('\nOverflow:', JSON.stringify(overflow, null, 2));
  
  // Check certificate button
  console.log('\n▶ Looking for certificate button');
  const certBtns = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => {
      const t = b.textContent.trim();
      return (t.includes('شهادة') || t.includes('certificate') || t.includes('Certificate') || t.includes('🏆'))
        && b.offsetParent !== null;
    });
    return btns.map(b => ({ text: b.textContent.trim().slice(0, 40), onclick: b.getAttribute('onclick') }));
  });
  console.log('Certificate buttons:', JSON.stringify(certBtns, null, 2));
  
  await browser.close();
})();
