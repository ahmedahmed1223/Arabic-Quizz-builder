// ============================================================
// pwa-register.js — Service Worker Registration Helper
// Phase 4 (T-040) — Registers the SW, handles updates, exposes API
// ============================================================
// Usage in app:
//   if ('serviceWorker' in navigator) {
//     PWA.register();
//   }
// API:
//   PWA.checkForUpdate()  — manually check for SW updates
//   PWA.applyUpdate()     — apply pending SW update
//   PWA.clearCache()      — clear all caches (for debugging)
//   PWA.isInstalled()     — check if running as installed PWA
// ============================================================

window.PWA = (function() {
  const SW_PATH = '/sw.js';
  const SW_SCOPE = '/';
  let _registration = null;
  let _updateAvailable = false;

  // ── Register the Service Worker ──
  async function register() {
    if (!('serviceWorker' in navigator)) {
      console.info('[PWA] Service Worker not supported — skipping registration');
      return null;
    }

    try {
      _registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: SW_SCOPE,
        updateViaCache: 'none',  // Always fetch latest SW from network
      });

      console.info('[PWA] Service Worker registered:', _registration.scope);

      // Listen for updates
      _registration.addEventListener('updatefound', () => {
        const newWorker = _registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New version available
                _updateAvailable = true;
                _notifyUpdateAvailable();
              } else {
                // First install — SW pre-cached assets
                console.info('[PWA] Content cached for offline use');
              }
            }
          });
        }
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.info('[PWA] SW updated to version:', event.data.version);
          _showUpdateToast();
        }
      });

      return _registration;
    } catch (err) {
      console.warn('[PWA] SW registration failed:', err);
      return null;
    }
  }

  // ── Check for updates manually ──
  async function checkForUpdate() {
    if (!_registration) return false;
    try {
      await _registration.update();
      return _updateAvailable;
    } catch (err) {
      console.warn('[PWA] Update check failed:', err);
      return false;
    }
  }

  // ── Apply pending update (reload page) ──
  async function applyUpdate() {
    if (!_registration || !_registration.waiting) {
      console.info('[PWA] No pending update to apply');
      return;
    }
    // Tell the waiting SW to skip waiting
    _registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    // Listen for controller change, then reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // ── Clear all caches (debugging) ──
  async function clearCache() {
    if (!_registration || !_registration.active) {
      console.warn('[PWA] No active SW to clear caches');
      return false;
    }
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.cleared);
      };
      _registration.active.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2]);
    });
  }

  // ── Check if running as installed PWA ──
  function isInstalled() {
    // iOS Safari
    if (window.navigator.standalone === true) return true;
    // Chrome/Edge/Firefox
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // Windows (display_override: window-controls-overlay)
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
    return false;
  }

  // ── Prompt user to install (beforeinstallprompt event) ──
  let _deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67+ from showing the mini-infobar
    e.preventDefault();
    _deferredPrompt = e;
    console.info('[PWA] beforeinstallprompt event captured — can show install button');
    _showInstallButton();
  });

  async function promptInstall() {
    if (!_deferredPrompt) {
      console.info('[PWA] No deferred install prompt available');
      return false;
    }
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    console.info('[PWA] Install prompt outcome:', outcome);
    return outcome === 'accepted';
  }

  // ── UI Helpers ──
  function _notifyUpdateAvailable() {
    // Dispatch a custom event that the app can listen for
    window.dispatchEvent(new CustomEvent('pwa-update-available', {
      detail: { version: 'v15.0' }
    }));
  }

  function _showUpdateToast() {
    if (typeof toast === 'function') {
      toast('تحديث جديد متاح — أعد تحميل الصفحة لتطبيقه', 'info');
    }
  }

  function _showInstallButton() {
    // Dispatch event — app can show an "Install App" button
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  }

  // ── Auto-check for updates every hour ──
  if ('serviceWorker' in navigator) {
    setInterval(() => {
      checkForUpdate();
    }, 60 * 60 * 1000);  // 1 hour
  }

  return {
    register,
    checkForUpdate,
    applyUpdate,
    clearCache,
    isInstalled,
    promptInstall,
    get updateAvailable() { return _updateAvailable; },
    get registration() { return _registration; },
  };
})();

// Auto-register on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PWA.register());
} else {
  PWA.register();
}
