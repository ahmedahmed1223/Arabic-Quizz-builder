// Dump the page's visible HTML after load, to understand what state we end up in.
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('quiz_v4_setup_done', '1');
    try { localStorage.setItem('quiz_v4_intro_seen', '1'); } catch {}
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => errors.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3500));

  // Dump only visible elements (not display:none)
  const visibleState = await page.evaluate(() => {
    const out = { visibleOverlays: [], visibleModals: [], bodyTop: '', activeTab: null };
    document.querySelectorAll('body > *').forEach(el => {
      const s = getComputedStyle(el);
      if (s.display !== 'none' && s.visibility !== 'hidden') {
        out.visibleOverlays.push({ id: el.id, cls: el.className, tag: el.tagName });
      }
    });
    // Get visible modal/overlay
    document.querySelectorAll('[id$="-overlay"], [id$="-modal"], [class*="modal"], [class*="overlay"]').forEach(el => {
      const s = getComputedStyle(el);
      if (s.display !== 'none' && s.visibility !== 'hidden') {
        out.visibleModals.push({ id: el.id, cls: el.className, tag: el.tagName, rect: el.getBoundingClientRect() });
      }
    });
    // Active nav tab
    const activeTab = document.querySelector('.nav-tab.active, .bottom-nav-item.active');
    if (activeTab) out.activeTab = { txt: activeTab.textContent.trim().slice(0, 40), aria: activeTab.getAttribute('aria-controls') };
    // Body top text
    out.bodyTop = document.body.innerText.slice(0, 600);
    return out;
  });

  console.log('=== VISIBLE BODY CHILDREN ===');
  visibleState.visibleOverlays.forEach(o => console.log(`  ${o.tag} #${o.id} .${o.cls}`));
  console.log('\n=== VISIBLE MODALS/OVERLAYS ===');
  visibleState.visibleModals.forEach(o => console.log(`  ${o.tag} #${o.id} .${(o.cls||'').slice(0,80)}`));
  console.log('\n=== ACTIVE TAB ===', JSON.stringify(visibleState.activeTab));
  console.log('\n=== BODY TEXT (top 600 chars) ===');
  console.log(visibleState.bodyTop);

  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.slice(0, 25).forEach(e => console.log('  ' + e));

  await browser.close();
})();
