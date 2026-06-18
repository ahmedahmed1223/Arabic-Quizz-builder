// Quick capture of solo map after fix
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
  await page.evaluate(() => { try { startSoloGame(); } catch(e){console.error(e);} });
  await wait(2500);
  
  await page.screenshot({ path: '/home/z/my-project/screenshots/solo-after-fix.png' });
  
  // Check final state
  const finalInfo = await page.evaluate(() => ({
    totalWorlds: document.querySelectorAll('.solo-world').length,
    lockedWorlds: document.querySelectorAll('.solo-world-locked').length,
    comingSoonCard: !!document.querySelector('.solo-world-coming-soon'),
    comingSoonText: document.querySelector('.solo-world-coming-soon')?.textContent?.trim().slice(0, 80),
  }));
  console.log(JSON.stringify(finalInfo, null, 2));
  
  await browser.close();
})();
