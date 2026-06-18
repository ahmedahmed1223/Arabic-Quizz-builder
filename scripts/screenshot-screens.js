// Comprehensive screenshot capture across viewports.
// Pre-sets localStorage so wizard is skipped; we land directly on admin dashboard.
// Captures: welcome (loading), admin dashboard, all admin tabs, intro screen, mobile bottom-nav.

const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/home/z/my-project/screenshots';
const BASE = 'http://localhost:4173/';
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile-390',  width: 390,  height: 844 },
  { name: 'tablet-768',  width: 768,  height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

const ALL_TABS = [
  ['settings', 'admin-settings'],
  ['appearance', 'admin-appearance'],
  ['categories', 'admin-categories'],
  ['teams', 'admin-teams'],
  ['credits', 'admin-credits'],
  ['import', 'admin-import'],
  ['help', 'admin-help'],
  ['reports', 'admin-reports'],
];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function snap(page, label, vname) {
  const file = path.join(OUT_DIR, `${vname}__${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('  📸 ' + path.basename(file));
}

async function setupContext(context) {
  // Pre-set localStorage so the wizard is skipped and admin is shown directly.
  await context.addInitScript(() => {
    localStorage.setItem('quiz_v4_setup_done', '1');
    // Mark intro visited so the loading flow goes to admin
    try { localStorage.setItem('quiz_v4_intro_seen', '1'); } catch {}
  });
}

async function shootViewport(viewport) {
  const { name: vname, width, height } = viewport;
  console.log(`\n═══ ${vname} (${width}x${height}) ═══`);

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await setupContext(context);
  const page = await context.newPage();

  const errors = [];
  page.on('console', m => {
    const t = m.type();
    if (t === 'error' || t === 'warning') {
      errors.push(`[${t}] ${m.text()}`);
    }
  });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  // ── 1. Loading screen ──
  console.log('▶ 01-loading');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await wait(1500);  // capture loading
  await snap(page, '01-loading', vname);

  // Wait for app to fully initialize
  await wait(2500);
  await snap(page, '02-after-load', vname);

  // ── 2. Try to access admin (skip password gate if any) ──
  console.log('▶ 03-admin-dashboard');
  // If there's a password modal, fill it
  const pwdInput = await page.$('input[type="password"]');
  if (pwdInput) {
    await pwdInput.fill('1234');
    // Click submit button
    const submit = await page.$('button[type="submit"], button:has-text("دخول"), button:has-text("Enter"), button:has-text("تأكيد"), .auth-modal button');
    if (submit) await submit.click().catch(()=>{});
    await wait(1200);
  }
  await snap(page, '03-admin-dashboard', vname);

  // ── 3. Navigate admin tabs ──
  for (const [tabKey, label] of ALL_TABS) {
    console.log('▶ ' + label);
    try {
      // Click the matching nav-tab
      const tab = await page.$(`.nav-tab[aria-controls="tab-${tabKey}"]`);
      if (tab) {
        await tab.click({ timeout: 3000 });
        await wait(900);
        await snap(page, label, vname);
      } else {
        console.log('  (skip: tab not found)');
      }
    } catch (e) {
      console.log('  (skip: ' + e.message.split('\n')[0] + ')');
    }
  }

  // ── 4. Intro / start game screen ──
  console.log('▶ intro-screen');
  try {
    // Use bottom-nav "بدء" button or call showView('intro')
    await page.evaluate(() => { if (typeof showView === 'function') showView('intro'); }).catch(()=>{});
    await wait(1500);
    await snap(page, '12-intro-start', vname);
  } catch (e) {
    console.log('  (skip intro: ' + e.message.split('\n')[0] + ')');
  }

  // Save errors
  if (errors.length) {
    // Dedupe
    const uniq = [...new Set(errors)];
    fs.writeFileSync(path.join(OUT_DIR, `${vname}__errors.txt`), uniq.join('\n'));
    console.log(`  ⚠ ${uniq.length} unique console errors/warnings`);
  } else {
    console.log('  ✓ no console errors');
  }

  await browser.close();
}

(async () => {
  for (const vp of VIEWPORTS) {
    try { await shootViewport(vp); }
    catch (e) { console.error('Viewport failed:', vp.name, e.message); }
  }
  console.log('\n✓ Done');
})();
