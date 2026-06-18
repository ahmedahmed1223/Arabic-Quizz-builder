// Lean single-viewport screenshot capture.
// Usage: node scripts/snap-one.js <viewport-name>

const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/home/z/my-project/screenshots';
const BASE = 'http://localhost:4173/';
fs.mkdirSync(OUT_DIR, { recursive: true });

const VP = process.argv[2] || 'desktop-1280';
const VPS = {
  'mobile-360':  { width: 360,  height: 720 },
  'mobile-390':  { width: 390,  height: 844 },
  'tablet-768':  { width: 768,  height: 1024 },
  'desktop-1280': { width: 1280, height: 800 },
  'projector-1920': { width: 1920, height: 1080 },
};
const { width, height } = VPS[VP] || VPS['desktop-1280'];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function snap(page, label) {
  const file = path.join(OUT_DIR, `${VP}__${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('  📸 ' + path.basename(file));
}

(async () => {
  console.log(`═══ ${VP} (${width}x${height}) ═══`);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    localStorage.setItem('quiz_v4_setup_done', '1');
    try { localStorage.setItem('quiz_v4_intro_seen', '1'); } catch {}
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => {
    const t = m.type();
    if (t === 'error' || t === 'warning') errors.push(`[${t}] ${m.text()}`);
  });
  page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));

  // 1. Loading screen
  console.log('▶ 01-loading');
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await wait(900);
  await snap(page, '01-loading');

  // 2. Intro launcher (after load)
  console.log('▶ 02-intro-launcher');
  await wait(2800);
  await snap(page, '02-intro-launcher');

  // 3. Open admin panel via login flow
  console.log('▶ 03-admin-dashboard');
  // Step 1: Click "Open Control Panel" button (reveals password field)
  const openBtn = await page.$('[onclick="showLoginPassword()"]');
  if (openBtn) {
    await openBtn.click().catch(()=>{});
    await wait(700);
  }
  // Step 2: Fill password + click "دخول"
  const pwdInput = await page.$('#login-password-input');
  if (pwdInput) {
    await pwdInput.fill('1234');
    await wait(200);
    const enterBtn = await page.$('[onclick="doLogin()"]');
    if (enterBtn) await enterBtn.click().catch(()=>{});
    await wait(1500);
  }
  await snap(page, '03-admin-dashboard');

  // 4. Cycle through admin tabs
  const tabs = [
    ['appearance', '04-appearance'],
    ['categories', '05-categories'],
    ['teams',      '06-teams'],
    ['credits',    '07-credits'],
    ['import',     '08-import'],
    ['reports',    '09-reports'],
    ['help',       '10-help'],
    ['settings',   '11-settings'],
  ];
  for (const [tabKey, label] of tabs) {
    console.log('▶ ' + label);
    try {
      const tab = await page.$(`.nav-tab[aria-controls="tab-${tabKey}"]`);
      if (tab) {
        await tab.click({ timeout: 3000 });
        await wait(800);
        await snap(page, label);
      } else {
        console.log('  (skip: tab not found)');
      }
    } catch (e) {
      console.log('  (skip: ' + e.message.split('\n')[0] + ')');
    }
  }

  // 5. Switch language and capture again
  console.log('▶ 12-admin-english');
  await page.evaluate(() => { if (typeof I18n !== 'undefined' && I18n.setLang) I18n.setLang('en'); }).catch(()=>{});
  await wait(800);
  await snap(page, '12-admin-english');

  if (errors.length) {
    const uniq = [...new Set(errors)];
    fs.writeFileSync(path.join(OUT_DIR, `${VP}__errors.txt`), uniq.join('\n'));
    console.log(`⚠ ${uniq.length} unique console errors/warnings`);
  } else {
    console.log('✓ no console errors');
  }

  await browser.close();
  console.log('✓ Done');
})();
