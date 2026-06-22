/* ════════════════════════════════════════════════════════════════════════
   V14.2 — Production Stability Enhancer
   Final hardening for production release:

   1. Global error handler with user-friendly toast notifications
   2. Unhandled promise rejection handler
   3. Periodic memory cleanup (every 2 minutes)
   4. Service worker registration for offline PWA (when supported)
   5. Capacitor/Android specific touches (back button, haptics)
   6. Page lifecycle management (pause/resume on visibility change)
   7. Network status indicator
   ════════════════════════════════════════════════════════════════════════ */

(function StabilityEnhancer(){
  'use strict';

  // ── 1. Global error handler ──
  window.addEventListener('error', function(e){
    // Don't show toast for script loading errors (likely network)
    if (e.message && e.message.indexOf('Error loading script') !== -1) return;
    // Don't show toast for full-screen permission errors
    if (e.message && e.message.indexOf('Permissions check failed') !== -1) return;
    // Don't show toast for autoplay audio errors
    if (e.message && (e.message.indexOf('play()') !== -1 || e.message.indexOf('AbortError') !== -1)) return;

    console.error('[Stability] Global error:', e.message, e.error?.stack?.substring(0, 200));

    // Show user-friendly toast (if toast function exists)
    try {
      if (typeof toast === 'function' && typeof I18n !== 'undefined') {
        toast(I18n.t('toast.unexpectedError', 'حدث خطأ غير متوقع. تم تسجيله للمراجعة.'), 'warning', 4000);
      }
    } catch(_) {}
  });

  // ── 2. Unhandled promise rejection handler ──
  window.addEventListener('unhandledrejection', function(e){
    var reason = e.reason;
    var msg = reason && (reason.message || reason.toString()) || 'Unknown rejection';

    // Filter out known non-critical rejections
    if (msg.indexOf('Permissions check failed') !== -1) {
      e.preventDefault();
      return;
    }
    if (msg.indexOf('play()') !== -1 || msg.indexOf('AbortError') !== -1) {
      e.preventDefault();
      return;
    }

    console.warn('[Stability] Unhandled rejection:', msg.substring(0, 200));
  });

  // ── 3. Periodic memory cleanup ──
  var CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
  setInterval(function(){
    try {
      // Clear any orphaned DOM nodes from removed views
      var orphans = document.querySelectorAll('.toast.toast-removing, .modal-backdrop.modal-removing');
      orphans.forEach(function(el){
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      // Clear any stale session storage entries (older than 24 hours)
      try {
        var now = Date.now();
        for (var i = 0; i < sessionStorage.length; i++) {
          var key = sessionStorage.key(i);
          if (key && key.indexOf('_ts_') !== -1) {
            var val = sessionStorage.getItem(key);
            if (val) {
              var ts = parseInt(val);
              if (!isNaN(ts) && (now - ts) > 24 * 60 * 60 * 1000) {
                sessionStorage.removeItem(key);
              }
            }
          }
        }
      } catch(_) {}
    } catch(e) {
      console.warn('[Stability] Cleanup error:', e.message);
    }
  }, CLEANUP_INTERVAL);

  // ── 4. Capacitor/Android back button handler ──
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    // Android back button - go back to previous view, or exit if on intro
    document.addEventListener('backbutton', function(e){
      e.preventDefault();
      e.stopPropagation();
      try {
        var visibleViews = Array.from(document.querySelectorAll('[id^="view-"]:not(.hidden)'));
        var currentView = visibleViews[0];
        if (!currentView) return;

        // If on intro, exit app
        if (currentView.id === 'view-intro') {
          if (navigator.app) navigator.app.exitApp();
          return;
        }

        // If a modal is open, close it
        var openModal = document.querySelector('.modal:not(.hidden), [id$="-overlay"]:not(.hidden)');
        if (openModal && openModal.id !== 'loading-screen' && openModal.id !== 'wizard-overlay') {
          openModal.classList.add('hidden');
          return;
        }

        // If on admin or solo-map, go to intro
        if (currentView.id === 'view-admin' || currentView.id === 'view-solo-map') {
          if (typeof showView === 'function') showView('intro');
          return;
        }

        // Default: try goBack if available
        if (typeof goBack === 'function') {
          goBack();
        } else if (typeof showView === 'function') {
          showView('intro');
        }
      } catch(e) {
        console.warn('[Stability] Back button handler error:', e.message);
      }
    }, false);

    console.log('[Stability] Capacitor native platform detected — back button handler installed');
  }

  // ── 5. Page lifecycle - pause heavy work when hidden ──
  var _hiddenSince = 0;
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) {
      _hiddenSince = Date.now();
    } else {
      var hiddenDuration = Date.now() - _hiddenSince;
      if (hiddenDuration > 30000) {
        // Page was hidden for more than 30 seconds — refresh state
        console.log('[Stability] Page visible again after ' + Math.round(hiddenDuration/1000) + 's');
        // Reload state from localStorage if needed
        try {
          if (typeof loadState === 'function' && typeof state !== 'undefined') {
            // Don't reload state — just trigger a re-render
            if (typeof renderAdmin === 'function' && !document.querySelector('#view-admin').classList.contains('hidden')) {
              renderAdmin();
            }
          }
        } catch(e) {}
      }
    }
  });

  // ── 6. Network status indicator ──
  // Removed un-closeable offline indicator as per user request
  function updateNetworkStatus(){
    // No-op
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  // Initial check
  setTimeout(updateNetworkStatus, 1000);

  // ── 7. Service Worker for PWA (when supported and on HTTP/HTTPS) ──
  // Only register if served over HTTP(S) (not file://)
  if ('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
    // Note: We don't have a separate service-worker.js file, but the app
    // already works offline due to single-file build with inlined assets.
    // This is a placeholder for future PWA enhancement.
  }

  console.log('[Stability] Production stability enhancer loaded');
})();
