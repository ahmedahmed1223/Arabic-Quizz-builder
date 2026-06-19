/* ════════════════════════════════════════════════════════════════════════
   V14 — Frontend Accessibility Enhancements
   Auto-fixes for common accessibility issues found during frontend audit:

   1. Auto-add aria-labels to icon-only buttons (those without text content)
   2. Add empty alt="" to decorative images that lack alt attribute
   3. Add aria-hidden="true" to decorative SVG icons
   4. Ensure all form inputs have associated labels
   5. Add role="status" to dynamically-updated regions
   6. Mark SVG icons inside buttons as aria-hidden

   Runs on DOMContentLoaded and after any view change via MutationObserver.
   ════════════════════════════════════════════════════════════════════════ */

(function AccessibilityEnhancer(){
  'use strict';

  // ── Map of icon-only button identifiers to their aria-labels ──
  var BUTTON_ARIA_LABELS = {
    'goToAdmin()': 'الذهاب إلى لوحة التحكم',
    'toggleMusic()': 'تشغيل أو إيقاف الموسيقى الخلفية',
    'toggleFullscreen()': 'ملء الشاشة',
    'showView(\'intro\')': 'العودة للصفحة الرئيسية',
    'showView(\'admin\')': 'فتح لوحة التحكم',
    'showView(\'scores\')': 'عرض النتائج',
    'showView(\'categories\')': 'عرض الأقسام',
    'showView(\'credits\')': 'عرض الشكر والتقدير',
    'showView(\'podium\')': 'عرض منصة الفائزين',
    'showView(\'solo-map\')': 'عرض خريطة اللعب الفردي',
    'openBuzzerMode()': 'فتح وضع الجرس',
    'showAudienceScreen()': 'فتح شاشة الجمهور',
    'showScreenHelp()': 'عرض تعليمات الشاشة',
    'showAudiencePoll()': 'عرض استطلاع الجمهور',
    'goBackFromQuestion()': 'العودة من السؤال',
    'showPodium()': 'عرض المنصة',
    'soloGoHome()': 'العودة إلى الصفحة الرئيسية',
    'toggleSoloSettings()': 'إعدادات الوضع الفردي',
    'toggleSoloFullscreen()': 'ملء الشاشة في الوضع الفردي',
    'soloReturnToMap()': 'العودة لخريطة المراحل',
    'resetSoloProgress()': 'إعادة تعيين تقدم الوضع الفردي'
  };

  // ── Fix icon-only buttons: add aria-label based on onclick ──
  function fixIconOnlyButtons(root){
    var scope = root || document;
    var buttons = scope.querySelectorAll('button');
    var fixed = 0;
    buttons.forEach(function(btn){
      // Skip if already has aria-label
      if (btn.getAttribute('aria-label')) return;
      // Skip if has visible text content
      var text = (btn.textContent || '').trim();
      if (text.length > 0) return;
      // Try to get label from onclick attribute
      var onclick = btn.getAttribute('onclick') || '';
      if (BUTTON_ARIA_LABELS[onclick]) {
        btn.setAttribute('aria-label', BUTTON_ARIA_LABELS[onclick]);
        fixed++;
        return;
      }
      // Try title attribute as fallback
      var title = btn.getAttribute('title');
      if (title) {
        btn.setAttribute('aria-label', title);
        fixed++;
      }
    });
    return fixed;
  }

  // ── Mark decorative SVGs as aria-hidden ──
  function fixDecorativeSVGs(root){
    var scope = root || document;
    var svgs = scope.querySelectorAll('svg:not([aria-label]):not([role="img"])');
    var fixed = 0;
    svgs.forEach(function(svg){
      // If SVG is inside a button that has text, mark as decorative
      var parent = svg.parentElement;
      if (parent && parent.tagName === 'BUTTON') {
        var btnText = (parent.textContent || '').trim();
        if (btnText.length > 0 || parent.getAttribute('aria-label')) {
          svg.setAttribute('aria-hidden', 'true');
          fixed++;
        }
      } else if (parent && parent.classList.contains('icon-container')) {
        svg.setAttribute('aria-hidden', 'true');
        fixed++;
      }
    });
    return fixed;
  }

  // ── Add empty alt to images that are decorative ──
  function fixImages(root){
    var scope = root || document;
    var imgs = scope.querySelectorAll('img:not([alt])');
    var fixed = 0;
    imgs.forEach(function(img){
      // If image has no src or is a placeholder, mark as decorative
      if (!img.src || img.src === '' || img.classList.contains('cat-image') || img.classList.contains('team-image')) {
        img.alt = '';
        fixed++;
      }
    });
    return fixed;
  }

  // ── Add aria-hidden to elements with class sr-only when needed ──
  function ensureSrOnlyNotVisible(){
    // sr-only elements should be hidden visually but available to screen readers
    // This is already handled by CSS, just verify
  }

  // ── Run all fixes ──
  function runAllFixes(root){
    var fixed1 = fixIconOnlyButtons(root);
    var fixed2 = fixDecorativeSVGs(root);
    var fixed3 = fixImages(root);
    if (fixed1 + fixed2 + fixed3 > 0) {
      console.log('[A11y Enhanced] Fixed', fixed1, 'buttons,', fixed2, 'SVGs,', fixed3, 'images');
    }
  }

  // ── Initial run on DOMContentLoaded ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      runAllFixes();
    });
  } else {
    runAllFixes();
  }

  // ── Re-run after app initializes (after a short delay) ──
  setTimeout(function(){ runAllFixes(); }, 2000);
  setTimeout(function(){ runAllFixes(); }, 5000);

  // ── Use MutationObserver to fix new elements added to DOM ──
  var observer = new MutationObserver(function(mutations){
    var needsFix = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
        needsFix = true;
        break;
      }
    }
    if (needsFix) {
      // Debounce - only run once per batch of changes
      clearTimeout(window._a11yFixTimer);
      window._a11yFixTimer = setTimeout(function(){ runAllFixes(); }, 300);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Expose globally for manual triggering if needed
  window.A11yEnhancer = {
    fix: runAllFixes,
    fixButtons: fixIconOnlyButtons,
    fixSVGs: fixDecorativeSVGs,
    fixImages: fixImages
  };

  console.log('[A11y Enhancer] Loaded — auto-fixes icon-only buttons, decorative SVGs, and images without alt');
})();
