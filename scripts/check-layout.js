// Check for real layout issues via DOM inspection (no VLM).
// Detects: overflowing buttons, truncated text (scrollWidth>clientWidth), 
// elements outside viewport, hidden bottom-nav buttons.

const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const VIEWPORTS = [
  { name: 'mobile-390',  width: 390,  height: 844 },
  { name: 'tablet-768',  width: 768,  height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

(async () => {
  for (const vp of VIEWPORTS) {
    console.log(`\n═══ ${vp.name} (${vp.width}x${vp.height}) ═══`);
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await ctx.addInitScript(() => {
      localStorage.setItem('quiz_v4_setup_done', '1');
      try { localStorage.setItem('quiz_v4_intro_seen', '1'); } catch {}
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Login
    await page.click('[onclick="showLoginPassword()"]').catch(()=>{});
    await page.waitForTimeout(500);
    await page.fill('#login-password-input', '1234').catch(()=>{});
    await page.click('[onclick="doLogin()"]').catch(()=>{});
    await page.waitForTimeout(1200);

    // Wait for admin to render
    await page.waitForTimeout(500);

    // Check 1: Bottom-nav overflow on mobile
    const bottomNavIssues = await page.evaluate(() => {
      const nav = document.getElementById('bottom-nav');
      if (!nav) return null;
      const cs = getComputedStyle(nav);
      const items = nav.querySelectorAll('.bottom-nav-item');
      const itemData = [...items].map(b => {
        const r = b.getBoundingClientRect();
        return { txt: b.textContent.trim().slice(0, 15), right: Math.round(r.right), left: Math.round(r.left), visible: r.width > 0 && r.height > 0 };
      });
      const navRect = nav.getBoundingClientRect();
      return {
        navDisplay: cs.display,
        navWidth: Math.round(navRect.width),
        navLeft: Math.round(navRect.left),
        navRight: Math.round(navRect.right),
        items: itemData,
        viewportWidth: window.innerWidth,
        overflow: nav.scrollWidth > nav.clientWidth,
      };
    });
    console.log('Bottom-nav:', bottomNavIssues ? JSON.stringify(bottomNavIssues, null, 2) : '(not present)');

    // Check 2: Top nav-tab overflow
    const topNavIssues = await page.evaluate(() => {
      const nav = document.querySelector('.admin-nav');
      if (!nav) return null;
      const items = nav.querySelectorAll('.nav-tab');
      const itemData = [...items].map(b => {
        const r = b.getBoundingClientRect();
        return { txt: b.textContent.trim().slice(0, 15), right: Math.round(r.right), left: Math.round(r.left), visible: r.width > 0 && r.height > 0 };
      });
      const navRect = nav.getBoundingClientRect();
      return {
        navWidth: Math.round(navRect.width),
        scrollWidth: nav.scrollWidth,
        overflow: nav.scrollWidth > nav.clientWidth + 2,
        items: itemData,
        viewportWidth: window.innerWidth,
      };
    });
    console.log('Top nav:', topNavIssues ? JSON.stringify({overflow: topNavIssues.overflow, scrollWidth: topNavIssues.scrollWidth, clientWidth: topNavIssues.navWidth, itemsOutsideViewport: topNavIssues.items.filter(i => i.right > topNavIssues.viewportWidth || i.left < 0)}, null, 2) : '(not present)');

    // Check 3: Stats cards text overflow
    const statsOverflow = await page.evaluate(() => {
      const cards = document.querySelectorAll('#settings-dashboard .card, #dash-total-q, #dash-total-cats, #dash-total-teams, #dash-sessions');
      const issues = [];
      cards.forEach(c => {
        const r = c.getBoundingClientRect();
        const txt = c.textContent.trim().slice(0, 50);
        // Check for any child with scrollWidth > clientWidth
        c.querySelectorAll('*').forEach(child => {
          if (child.scrollWidth > child.clientWidth + 2 && child.clientWidth > 0) {
            issues.push({ txt: child.textContent.trim().slice(0, 40), scrollW: child.scrollWidth, clientW: child.clientWidth });
          }
        });
      });
      return issues.slice(0, 5);
    });
    console.log('Stats text overflow:', statsOverflow.length === 0 ? 'none' : JSON.stringify(statsOverflow, null, 2));

    // Check 4: Buttons outside viewport
    const buttonsOutside = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const btns = document.querySelectorAll('button');
      const outside = [];
      btns.forEach(b => {
        const r = b.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return; // hidden
        if (r.right > vw + 2 || r.left < -2 || r.bottom > vh + 2 || r.top < -2) {
          // Only count visible (in current scroll) buttons
          const style = getComputedStyle(b);
          if (style.visibility !== 'hidden' && style.display !== 'none') {
            outside.push({ txt: b.textContent.trim().slice(0, 30), right: Math.round(r.right), left: Math.round(r.left), bottom: Math.round(r.bottom), top: Math.round(r.top) });
          }
        }
      });
      return outside.slice(0, 8);
    });
    console.log('Buttons outside viewport:', buttonsOutside.length === 0 ? 'none' : JSON.stringify(buttonsOutside, null, 2));

    await browser.close();
  }
})();
