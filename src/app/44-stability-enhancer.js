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

  // ── 0. Global safe proxies for memory & error containment ──
  var _trackedBlobUrls = [];
  try {
    var _origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function(blob) {
      var url = _origCreateObjectURL.apply(this, arguments);
      if (blob instanceof Blob) {
        _trackedBlobUrls.push({
          url: url,
          type: blob.type,
          created: Date.now()
        });
      }
      return url;
    };
  } catch(e) {
    console.warn('[Stability] Failed to proxy URL.createObjectURL:', e.message);
  }

  // Prevent closed or invalid BroadcastChannels from throwing uncaught errors that freeze execution
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      var _origPostMessage = BroadcastChannel.prototype.postMessage;
      BroadcastChannel.prototype.postMessage = function() {
        try {
          return _origPostMessage.apply(this, arguments);
        } catch(err) {
          console.warn('[Stability] BroadcastChannel.postMessage error caught (prevented crash):', err.message);
        }
      };
    } catch(e) {
      console.warn('[Stability] Failed to wrap BroadcastChannel.postMessage:', e.message);
    }
  }

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
      var now = Date.now();

      // Clear any orphaned DOM nodes from removed views
      var orphans = document.querySelectorAll('.toast.toast-removing, .modal-backdrop.modal-removing');
      orphans.forEach(function(el){
        if (el.parentNode) el.parentNode.removeChild(el);
      });

      // Clear any stale session storage entries (older than 24 hours)
      try {
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

      // Auto-revoke leaked download Blobs older than 2 minutes
      _trackedBlobUrls = _trackedBlobUrls.filter(function(item){
        if (item.type && item.type.indexOf('image') === -1 && item.type.indexOf('audio') === -1 && item.type.indexOf('video') === -1) {
          if (now - item.created > 2 * 60 * 1000) {
            try {
              URL.revokeObjectURL(item.url);
              console.log('[Stability] Auto-revoked leaked download Blob URL:', item.url, '(' + item.type + ')');
            } catch(_) {}
            return false; // remove from tracking
          }
        }
        return true; // keep tracking
      });

      // Emergency garbage collection if Heap memory usage is dangerously high (>85% of limit)
      if (window.performance && performance.memory) {
        var mem = performance.memory;
        if (mem.usedJSHeapSize > mem.jsHeapSizeLimit * 0.85) {
          console.warn('[Stability] Extremely high memory heap usage detected (' + Math.round(mem.usedJSHeapSize / 1024 / 1024) + 'MB). Running emergency GC...');
          try {
            if (typeof cleanupMemory === 'function') cleanupMemory();
            if (typeof window.Quiz !== 'undefined' && typeof window.Quiz.cleanupMemory === 'function') window.Quiz.cleanupMemory();
            if (typeof AudioMixer !== 'undefined' && AudioMixer.cleanup) AudioMixer.cleanup();
          } catch(_) {}
        }
      }

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

  // ── 8. Wake Lock API (Prevent screen from sleeping during a match) ──
  var _wakeLock = null;
  var _noSleepVideo = null;

  async function _requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !_wakeLock) {
        _wakeLock = await navigator.wakeLock.request('screen');
        _wakeLock.addEventListener('release', function() {
          console.log('[Stability] Screen Wake Lock released');
          _wakeLock = null;
        });
        console.log('[Stability] Screen Wake Lock acquired');
      }
    } catch (err) {
      console.warn('[Stability] Wake Lock error:', err.name, err.message);
    }
    
    // Fallback for iOS / Safari: Play a silent invisible video
    if (!_noSleepVideo) {
      _noSleepVideo = document.createElement('video');
      _noSleepVideo.setAttribute('playsinline', '');
      _noSleepVideo.setAttribute('muted', '');
      _noSleepVideo.setAttribute('loop', '');
      _noSleepVideo.muted = true;
      _noSleepVideo.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
      // 1-pixel silent mp4 base64
      _noSleepVideo.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAW1wNDFpc29tAAAAAHV1dWQiem1iAAB1cAAAAAAOBh4OAAAAAE1kYXQAAAAAABhtZGF0AAAAABxzdGNvAAAAAAAAAAEAAAAwAAAAHG1vb3YAAABsbXZoZAAAAADawd1L2sHdSwAAA+gAAAPoAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAwbWV0YQAAAChoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU5LjE2LjEwMA==';
      document.body.appendChild(_noSleepVideo);
    }
    try {
      _noSleepVideo.play().catch(function(){});
    } catch(e) {}
  }

  function _releaseWakeLock() {
    if (_wakeLock !== null) {
      _wakeLock.release().catch(function(){});
    }
    if (_noSleepVideo) {
      _noSleepVideo.pause();
    }
  }

  function _handleWakeLockVisibility() {
    if (document.visibilityState === 'visible') {
      var cv = window._currentView;
      if (cv === 'question' || cv === 'match' || cv === 'podium' || cv === 'wheel') {
        _requestWakeLock();
      }
    }
  }

  document.addEventListener('visibilitychange', _handleWakeLockVisibility);
  
  // Try to acquire wake lock when a view changes
  var _origShowViewStability = window.showView;
  if (typeof window.showView === 'function') {
    window.showView = function() {
      var res = _origShowViewStability.apply(this, arguments);
      var cv = window._currentView;
      if (cv === 'question' || cv === 'match' || cv === 'podium' || cv === 'wheel') {
        _requestWakeLock();
      } else if (cv === 'intro' || cv === 'admin') {
         _releaseWakeLock();
      }
      return res;
    };
  }

  // Also bind to user interaction to ensure iOS allows playback
  document.addEventListener('click', function() {
    var cv = window._currentView;
    if (cv === 'question' || cv === 'match' || cv === 'podium' || cv === 'wheel') {
      _requestWakeLock();
    }
  }, { once: false });

  console.log('[Stability] Production stability enhancer loaded');
})();
