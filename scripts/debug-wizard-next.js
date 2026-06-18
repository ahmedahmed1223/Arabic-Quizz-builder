// Add console logging to wizard next click
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz'));
    keys.forEach(k => localStorage.removeItem(k));
  });
  const page = await ctx.newPage();
  
  // Capture ALL console messages
  page.on('console', m => {
    const t = m.type();
    if (t === 'error' || t === 'warning' || t === 'info') {
      console.log(`[browser ${t}] ${m.text()}`);
    }
  });
  page.on('pageerror', e => console.log(`[PAGE ERROR] ${e.message}`));
  
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  
  // Inspect wizard state directly
  const wizardState = await page.evaluate(() => {
    return {
      wizardExists: typeof Wizard !== 'undefined',
      currentStep: typeof Wizard !== 'undefined' ? 'check below' : null,
    };
  });
  console.log('Wizard exists:', wizardState.wizardExists);
  
  // Try calling Wizard.next() directly
  const nextResult = await page.evaluate(() => {
    try {
      const before = document.querySelector('.wiz-step.active')?.dataset?.step || 
                     document.querySelector('.wiz-step:not(.hidden)')?.dataset?.step;
      console.log('Before next: step=' + before);
      Wizard.next();
      const after = document.querySelector('.wiz-step.active')?.dataset?.step || 
                    document.querySelector('.wiz-step:not(.hidden)')?.dataset?.step;
      console.log('After next: step=' + after);
      return { before, after };
    } catch (e) {
      console.log('Wizard.next() error:', e.message);
      return { error: e.message };
    }
  });
  console.log('Next result:', JSON.stringify(nextResult));
  
  await page.waitForTimeout(500);
  
  // Try next 4 more times
  for (let i = 0; i < 5; i++) {
    const r = await page.evaluate(() => {
      try {
        Wizard.next();
        return document.querySelector('.wiz-step.active')?.dataset?.step || 
               document.querySelector('.wiz-step:not(.hidden)')?.dataset?.step;
      } catch (e) { return 'err: ' + e.message; }
    });
    console.log(`After next ${i+2}: step=${r}`);
    await page.waitForTimeout(300);
  }
  
  await browser.close();
})();
