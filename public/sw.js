// ============================================================
// sw.js — Service Worker for Arabic Quiz Builder V15.0
// Phase 4 (T-040) — PWA + Offline Support
// ============================================================
// Strategy:
//   1. App Shell (HTML/CSS/JS): Cache-First with network fallback
//      — single-file build means ONE cache entry for index.html
//   2. Google Fonts: Stale-While-Revalidate (CDN, semi-static)
//   3. External Library (raw.githubusercontent.com): Network-First
//      with cache fallback (allows updates, but works offline if cached)
//   4. Images/Media: Cache-First (don't re-fetch base64 inlined assets)
//   5. Navigation requests: Network-First falling back to cached shell
//      (ensures users get latest version when online, offline shell when not)
// ============================================================

const CACHE_VERSION = 'v15.0-v1';
const STATIC_CACHE = `quiz-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `quiz-runtime-${CACHE_VERSION}`;
const FONT_CACHE = `quiz-fonts-${CACHE_VERSION}`;

// Resources to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/src/favicon.png',
  '/src/favicon-32.png',
  '/manifest.json',
];

// Maximum age for runtime cache entries (24 hours)
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

// ============================================================
// INSTALL — Pre-cache app shell
// ============================================================
self.addEventListener('install', (event) => {
  console.info('[SW] Installing v15.0...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.info('[SW] Pre-caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        // Activate immediately (don't wait for old SW to die)
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Pre-cache failed (some assets may not exist yet):', err);
      })
  );
});

// ============================================================
// ACTIVATE — Clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.info('[SW] Activating v15.0...');
  const allowedCaches = [STATIC_CACHE, RUNTIME_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!allowedCaches.includes(cacheName)) {
              console.info('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients that a new SW is active
        return self.clients.matchAll({ includeUncontrolled: true });
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      })
  );
});

// ============================================================
// FETCH — Routing logic
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, etc.) — don't cache mutations
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension:// and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip cross-origin requests that aren't fonts or CDN assets
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFonts = url.origin === 'https://fonts.googleapis.com' ||
                        url.origin === 'https://fonts.gstatic.com';
  const isGitHubRaw = url.origin === 'https://raw.githubusercontent.com';

  // ── 1. Google Fonts: Stale-While-Revalidate ──
  if (isGoogleFonts) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  // ── 2. External Library (GitHub raw): Network-First with cache fallback ──
  if (isGitHubRaw) {
    event.respondWith(networkFirstWithCacheFallback(request, RUNTIME_CACHE));
    return;
  }

  // ── 3. Navigation requests (HTML pages): Network-First ──
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCacheFallback(request, STATIC_CACHE, '/index.html'));
    return;
  }

  // ── 4. Same-origin static assets: Cache-First ──
  if (isSameOrigin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // ── 5. Other cross-origin requests: try runtime cache, fall back to network ──
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// ============================================================
// Cache Strategies
// ============================================================

// Cache-First: Try cache, fall back to network, cache the response
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not cached — return a fallback
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Stale-While-Revalidate: Return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached); // If network fails, return cached (already returned)

  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// Network-First: Try network, fall back to cache, then fallback to fallbackURL
async function networkFirstWithCacheFallback(request, cacheName, fallbackURL) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Not in cache — try fallback URL (for navigations)
    if (fallbackURL) {
      const fallback = await caches.match(fallbackURL);
      if (fallback) {
        return fallback;
      }
    }
    // Total failure
    return new Response('Offline and not cached', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// ============================================================
// MESSAGE — Handle messages from clients
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(STATIC_CACHE),
        caches.delete(RUNTIME_CACHE),
        caches.delete(FONT_CACHE),
      ]).then(() => {
        event.ports[0].postMessage({ cleared: true });
      })
    );
  }
});

// ============================================================
// Periodic Cleanup — Remove old runtime cache entries (every 24h)
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP') {
    event.waitUntil(cleanupOldEntries(RUNTIME_CACHE));
  }
});

async function cleanupOldEntries(cacheName) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const now = Date.now();

  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      const age = now - new Date(dateHeader).getTime();
      if (age > MAX_CACHE_AGE_MS) {
        await cache.delete(request);
      }
    }
  }
}

console.info('[SW] Service Worker v15.0 loaded');
