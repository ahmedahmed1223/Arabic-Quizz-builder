// ════════════════════════════════════════════════════════
//  V16.0: Interactive Onboarding — first-time user guide
// ════════════════════════════════════════════════════════
/**
 * Onboarding system for first-time users.
 * Shows a 4-step interactive walkthrough on first login.
 * Tracks completion in localStorage('v16_onboarding_done').
 */
window.Onboarding = (function() {
  'use strict';

  var _steps = [
    {
      icon: '📝',
      title: 'أنشئ أقساماً',
      text: 'ابدأ بإنشاء أقسام لمسابقتك (مثلاً: تاريخ، علوم، قرآن). كل قسم يحتوي أسئلتك.',
      action: 'إدارة الأقسام',
      target: 'categories'
    },
    {
      icon: '❓',
      title: 'أضف أسئلة',
      text: 'لكل قسم، أضف أسئلة من 10 أنواع: اختيار من متعدد، صح/خطأ، رياضيات، صور، صوت، وأكثر.',
      action: 'إضافة أسئلة',
      target: 'questions'
    },
    {
      icon: '👥',
      title: 'أعدّ الفرق',
      text: 'أنشئ فرقاً بأسماء وألوان وأعضاء. حتى 10 فرق لكل مسابقة.',
      action: 'إدارة الفرق',
      target: 'teams'
    },
    {
      icon: '▶️',
      title: 'ابدأ العرض',
      text: 'انقر "بدء العرض" لتشغيل المسابقة على البروجكتر مع شاشة تحكم عن بُعد.',
      action: 'بدء المسابقة',
      target: 'intro'
    }
  ];

  var _currentStep = 0;
  var _overlay = null;

  /**
   * Check if onboarding should be shown (first-time users only).
   * @returns {boolean}
   */
  function shouldShow() {
    try {
      return !localStorage.getItem('v16_onboarding_done');
    } catch (e) {
      return false;
    }
  }

  /**
   * Start the onboarding walkthrough.
   */
  function start() {
    if (!shouldShow()) return;
    _currentStep = 0;
    _showStep();
  }

  function _showStep() {
    _dismiss();
    if (_currentStep >= _steps.length) {
      _complete();
      return;
    }

    var step = _steps[_currentStep];
    _overlay = document.createElement('div');
    _overlay.id = 'v16-onboarding-overlay';
    _overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(8,9,26,.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px';

    var card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-surface,#12152e);border:1px solid var(--border,#1e2240);border-radius:16px;padding:32px;max-width:440px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)';

    var progress = (_currentStep + 1) + ' / ' + _steps.length;

    card.innerHTML =
      '<div style="font-size:3rem;margin-bottom:16px">' + step.icon + '</div>' +
      '<div style="color:var(--accent1,#00f5d4);font-size:.8rem;font-weight:700;margin-bottom:8px">' + progress + '</div>' +
      '<h2 style="color:var(--text-primary,#e8f4ff);font-size:1.4rem;margin-bottom:12px">' + step.title + '</h2>' +
      '<p style="color:var(--text-secondary,#8aa0bd);font-size:.95rem;line-height:1.6;margin-bottom:24px">' + step.text + '</p>' +
      '<div style="display:flex;gap:8px;justify-content:center">' +
        '<button id="v16-ob-skip" style="padding:10px 20px;border:1px solid var(--border,#1e2240);background:transparent;color:var(--text-secondary,#8aa0bd);border-radius:8px;cursor:pointer;font-family:inherit">تخطّي</button>' +
        '<button id="v16-ob-next" style="padding:10px 24px;background:linear-gradient(135deg,var(--accent1,#00f5d4),var(--accent2,#7b61ff));color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit">' + step.action + '</button>' +
      '</div>';

    _overlay.appendChild(card);
    document.body.appendChild(_overlay);

    document.getElementById('v16-ob-skip').addEventListener('click', _dismiss);
    document.getElementById('v16-ob-next').addEventListener('click', function() {
      _currentStep++;
      _showStep();
    });
  }

  function _dismiss() {
    if (_overlay && _overlay.parentNode) {
      _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
    }
  }

  function _complete() {
    try {
      localStorage.setItem('v16_onboarding_done', '1');
    } catch (e) {}
    if (typeof toast === 'function') {
      toast('🎉 مرحباً بك! أنت جاهز لإنشاء مسابقتك الأولى', 'success');
    }
  }

  /**
   * Reset onboarding (show again on next login).
   */
  function reset() {
    try {
      localStorage.removeItem('v16_onboarding_done');
    } catch (e) {}
    if (typeof toast === 'function') {
      toast('سيظهر الدليل التفاعلي في المرة القادمة', 'info');
    }
  }

  return {
    shouldShow: shouldShow,
    start: start,
    reset: reset
  };
})();

console.info('[Onboarding] V16.0 interactive onboarding loaded');

// V16-018: Quick theme toggle function
window.v16_toggleThemeQuick = function() {
  try {
    var currentTheme = (typeof state !== 'undefined' && state.settings && state.settings.theme) || 'space';
    var newTheme = (currentTheme === 'space' || currentTheme === 'dark') ? 'light' : 'space';
    if (typeof applyTheme === 'function') {
      applyTheme(newTheme, true);
      if (typeof toast === 'function') {
        toast(newTheme === 'light' ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن', 'info');
      }
      // Update button icon
      var btn = document.getElementById('v16-theme-toggle');
      if (btn) btn.textContent = (newTheme === 'light') ? '☀️' : '🌙';
    }
  } catch (e) {
    console.error('[V16] Theme toggle failed:', e);
  }
};

