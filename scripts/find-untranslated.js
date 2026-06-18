// Capture all visible text in admin dashboard in both Arabic and English mode
// to find untranslated Arabic strings.
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
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Login flow
  await page.click('[onclick="showLoginPassword()"]').catch(()=>{});
  await page.waitForTimeout(700);
  await page.fill('#login-password-input', '1234').catch(()=>{});
  await page.click('[onclick="doLogin()"]').catch(()=>{});
  await page.waitForTimeout(1500);

  // Switch to English
  await page.evaluate(() => { if (typeof I18n !== 'undefined') I18n.setLang('en'); });
  await page.waitForTimeout(800);

  // Capture visible text in admin content
  const enText = await page.evaluate(() => {
    const admin = document.querySelector('#view-admin, .admin-content, #tab-settings');
    if (!admin) return '(admin not found)';
    // Get text nodes only (skip script/style)
    const walker = document.createTreeWalker(admin, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const texts = [];
    let node;
    while (node = walker.nextNode()) {
      const t = node.nodeValue.trim();
      if (t && t.length > 1 && t.length < 200) texts.push(t);
    }
    return texts;
  });

  console.log('=== Visible text in admin (English mode) ===');
  console.log('Total text fragments:', enText.length);
  console.log('\n--- All fragments ---');
  enText.forEach((t,i) => console.log(`${i+1}. "${t}"`));

  // Find any Arabic chars
  const arabicRe = /[\u0600-\u06FF]/;
  const stillArabic = enText.filter(t => arabicRe.test(t));
  console.log('\n--- Fragments still containing Arabic ---');
  if (stillArabic.length === 0) console.log('None — all translated!');
  else stillArabic.forEach(t => console.log(`  ⚠ "${t}"`));

  await browser.close();
})();
