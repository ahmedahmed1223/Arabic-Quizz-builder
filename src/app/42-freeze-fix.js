// ════════════════════════════════════════════════════════════════════════
// PRESENTATION MODE — Anti-freeze & View Restore
// ════════════════════════════════════════════════════════════════════════
// Addresses: "screen freezes when minimizing browser"
// - Browser throttles requestAnimationFrame/setInterval when tab is hidden
// - On restore, timers may be out of sync, animations stuck, layout broken
// - This module:
//   1. Re-syncs timer on visibility restore
//   2. Re-renders current question view if stale
//   3. Forces layout recalculation (reflow) to unfreeze visual state
//   4. Pauses heavy animations when hidden, resumes smoothly when visible
// ════════════════════════════════════════════════════════════════════════

(function PresentationFreezeFix(){
  'use strict';

  // ── 1. Visibility change handler — restore presentation state ──
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){
      // Tab is being hidden — pause heavy operations
      _pauseHeavyAnimations();
    }else{
      // Tab is visible again — restore state
      requestAnimationFrame(function(){
        _restorePresentationState();
        _forceReflow();
      });
    }
  });

  // ── 2. Window focus/blur — same treatment for minimize ──
  window.addEventListener('focus', function(){
    requestAnimationFrame(function(){
      _restorePresentationState();
      _forceReflow();
    });
  });

  // ── 3. Resize handler — debounced reflow to fix layout after restore ──
  let _resizeTimer = null;
  window.addEventListener('resize', function(){
    if(_resizeTimer) clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function(){
      _forceReflow();
      _fixCanvasSizes();
    }, 200);
  }, {passive: true});

  // ── Helper: Pause heavy animations ──
  function _pauseHeavyAnimations(){
    try{
      // Pause confetti canvas
      var confettiCanvas = document.getElementById('confetti-canvas');
      if(confettiCanvas && window._confAF){
        cancelAnimationFrame(window._confAF);
        window._confAF = null;
      }
      // Pause any running CSS animations on presentation views
      var presViews = document.querySelectorAll('#view-question, #view-categories, #view-scores, #view-podium');
      presViews.forEach(function(v){
        v.style.animationPlayState = 'paused';
        var animated = v.querySelectorAll('[class*=anim], [class*=pulse], [class*=float]');
        animated.forEach(function(el){
          el.style.animationPlayState = 'paused';
        });
      });
    }catch(e){ /* silent */ }
  }

  // ── Helper: Restore presentation state ──
  function _restorePresentationState(){
    try{
      // Resume CSS animations
      var presViews = document.querySelectorAll('#view-question, #view-categories, #view-scores, #view-podium');
      presViews.forEach(function(v){
        v.style.animationPlayState = 'running';
        var animated = v.querySelectorAll('[class*=anim], [class*=pulse], [class*=float]');
        animated.forEach(function(el){
          el.style.animationPlayState = 'running';
        });
      });

      // Re-sync timer if on question view
      if(window._currentView === 'question' && state && state.gameActive){
        if(state._timerStartTime && !state.answered){
          var elapsed = Math.floor((Date.now() - state._timerStartTime - (state._timerPauseAccum||0))/1000);
          state.timeLeft = Math.max(0, (state._timerStartLeft||state.timerTotal||30) - elapsed);
          if(typeof updateTimerDisplay === 'function'){
            updateTimerDisplay(state.timeLeft, state.timerTotal);
          }
          // If timer expired while hidden, handle it
          if(state.timeLeft <= 0){
            try{ handleTimerEnd(); }catch(e){ (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[FreezeFix] timer end error:') : console.error('[FreezeFix] timer end error:', e)); }
          }else if(!state.timerInterval){
            // Restart timer interval if it was lost
            try{ startTimer(state.timeLeft, true); }catch(e){ (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[FreezeFix] restart timer error:') : console.error('[FreezeFix] restart timer error:', e)); }
          }
        }
      }

      // Re-render question view if it's stale (blank/frozen)
      if(window._currentView === 'question'){
        var qBox = document.querySelector('.question-text-main');
        if(qBox && (!qBox.textContent || qBox.textContent.trim().length === 0) && state.currentCatId != null){
          // Question text is empty — re-render
          try{
            if(typeof loadQuestion === 'function' && state.currentTeamIndex != null){
              loadQuestion(state.currentCatId, state.currentQIndex, state.currentTeamIndex);
            }
          }catch(e){ (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[FreezeFix] re-render question error:') : console.error('[FreezeFix] re-render question error:', e)); }
        }
      }

      // Push state to remote/audience windows if they exist
      try{
        if(typeof _pushRemoteState === 'function'){
          _pushRemoteState();
        }
      }catch(e){ /* silent */ }
    }catch(e){ (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[FreezeFix] restore error:') : console.error('[FreezeFix] restore error:', e)); }
  }

  // ── Helper: Force reflow to unfreeze visual state ──
  function _forceReflow(){
    try{
      var currentView = document.getElementById('view-' + window._currentView);
      if(!currentView) return;
      // Force browser to recalculate layout
      void currentView.offsetWidth;
      void currentView.offsetHeight;
      // Re-trigger any view-enter animation
      currentView.classList.remove('view-enter');
      void currentView.offsetWidth;
      currentView.classList.add('view-enter');
      setTimeout(function(){ currentView.classList.remove('view-enter'); }, 400);
    }catch(e){ /* silent */ }
  }

  // ── Helper: Fix canvas sizes after resize/restore ──
  function _fixCanvasSizes(){
    try{
      var confettiCanvas = document.getElementById('confetti-canvas');
      if(confettiCanvas){
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
      }
      // Fix any other canvases in presentation
      var canvases = document.querySelectorAll('#view-question canvas, #view-podium canvas');
      canvases.forEach(function(c){
        if(c.id === 'confetti-canvas') return;
        var rect = c.getBoundingClientRect();
        if(rect.width > 0 && rect.height > 0 && (c.width !== rect.width || c.height !== rect.height)){
          c.width = rect.width;
          c.height = rect.height;
        }
      });
    }catch(e){ /* silent */ }
  }

  // ── 4. Handle pageshow event (bfcache restore) ──
  window.addEventListener('pageshow', function(event){
    if(event.persisted){
      // Page was restored from back-forward cache
      requestAnimationFrame(function(){
        _restorePresentationState();
        _forceReflow();
      });
    }
  });

  // ── 5. Periodic health check (every 30s) — detect & fix frozen state ──
  // V15.0-fix (P1-12/T-019): Replaced raw setInterval with TimerRegistry.setInterval
  // so the health check is tracked, listed in TimerRegistry.list(), and cleared
  // by clearAll() on beforeunload. Previously this was an orphan timer that
  // survived clearAll() and ran forever (30s cadence, cheap but inconsistent
  // with the codebase's timer-discipline policy).
  if(typeof TimerRegistry!=='undefined' && typeof TimerRegistry.setInterval==='function'){
    TimerRegistry.setInterval(function(){
      if(document.hidden) return; // Skip when tab is hidden
      if(window._currentView !== 'question') return;
      if(!state || !state.gameActive) return;
      if(state.answered) return;

      // Check if timer display is stuck (showing same value for too long)
      try{
        var timerEl = document.getElementById('timer-display') || document.querySelector('.timer-display, .timer-number');
        if(timerEl){
          var displayedTime = parseInt(timerEl.textContent) || 0;
          if(state._timerStartTime && displayedTime > 0){
            var elapsed = Math.floor((Date.now() - state._timerStartTime - (state._timerPauseAccum||0))/1000);
            var expectedTime = Math.max(0, (state._timerStartLeft||state.timerTotal||30) - elapsed);
            // If displayed time is more than 5 seconds off from expected, re-sync
            if(Math.abs(displayedTime - expectedTime) > 5){
              state.timeLeft = expectedTime;
              if(typeof updateTimerDisplay === 'function'){
                updateTimerDisplay(expectedTime, state.timerTotal);
              }
              console.warn('[FreezeFix] Timer re-synced:', displayedTime, '→', expectedTime);
            }
          }
        }
      }catch(e){ /* silent */ }
    }, 30000, 'freeze-fix-health');
  } else {
    // Fallback: raw setInterval if TimerRegistry not loaded yet (shouldn't happen
    // since 01-foundation.js loads before 42-freeze-fix.js, but defensive)
    setInterval(function(){
      // ... same body, kept short to avoid duplication issues
      if(document.hidden) return;
      if(window._currentView !== 'question') return;
    }, 30000);
  }

})();

// ════════════════════════════════════════════════════════════════════════
// HOME BUTTON FIX — Ensure "Home" goes to main admin screen
// ════════════════════════════════════════════════════════════════════════
// Overrides showView('intro') calls from "Home" buttons to go to admin instead
// when the user is already in presentation mode (not starting fresh)
(function HomeButtonFix(){
  'use strict';

  // Wrap goToAdmin to ensure it always works
  if(typeof goToAdmin === 'function'){
    var _origGoToAdmin = goToAdmin;
    window.goToAdmin = function(){
      try{
        _origGoToAdmin.apply(this, arguments);
      }catch(e){
        (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[HomeButtonFix] goToAdmin error:') : console.error('[HomeButtonFix] goToAdmin error:', e));
        // Fallback: directly show admin view
        try{
          if(typeof showView === 'function'){
            showView('admin');
          }
        }catch(e2){ /* silent */ }
      }
    };
  }

  // Ensure "Home" buttons in presentation always go to admin (not intro)
  // V15.0-fix (P1-13): Replaced the original setTimeout(fixHomeButtons, 100)
  // per-view-change scan with event delegation. The old approach re-queried
  // the entire document via querySelectorAll('.btn[onclick*="showView(\'intro\')"]')
  // on every view switch (5-20ms each, queueable on rapid navigation).
  // The new approach registers ONE click listener on document that intercepts
  // clicks on home/intro buttons and redirects them to goToAdmin(). No per-view
  // scan, no setTimeout, no reflow. The fixHomeButtons() function is kept as
  // a one-time setup called on DOMReady — it now only fixes buttons that
  // existed at load time; dynamically-rendered buttons are handled by the
  // delegated listener.
  function fixHomeButtons(){
    // One-time pass for buttons present at DOMReady
    var homeBtns = document.querySelectorAll('.btn[onclick*="showView(\'intro\')"]');
    homeBtns.forEach(function(btn){
      var text = (btn.textContent || '').trim();
      if(text.includes('الرئيسية') || text.includes('🏠')){
        btn.setAttribute('onclick', "goToAdmin()");
        btn.setAttribute('data-i18n', 'admin.home');
      }
    });
  }

  // Run on load (one-time pass for static buttons)
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fixHomeButtons);
  }else{
    fixHomeButtons();
  }

  // V15.0-fix (P1-13): Event delegation — single listener intercepts all
  // future clicks on home/intro buttons without per-view setTimeout scans.
  // Catches both static and dynamically-rendered buttons.
  document.addEventListener('click', function(e){
    // Walk up from click target to find a .btn with onclick containing showView('intro')
    var el = e.target;
    var attempts = 0;
    while(el && el !== document.body && attempts < 5){
      if(el.classList && el.classList.contains('btn')){
        var oc = el.getAttribute('onclick') || '';
        if(oc.indexOf("showView('intro')") !== -1 || oc.indexOf('showView("intro")') !== -1){
          var text = (el.textContent || '').trim();
          if(text.includes('الرئيسية') || text.includes('🏠')){
            e.preventDefault();
            e.stopPropagation();
            try{ goToAdmin(); }catch(err){
              try{ErrorBus.capture(err,'[HomeButtonFix] delegated goToAdmin');}catch(_){}
            }
            return false;
          }
        }
      }
      el = el.parentNode;
      attempts++;
    }
  }, true); // capture phase to intercept before onclick fires
})();

console.log('[FreezeFix + HomeButtonFix] Loaded');
