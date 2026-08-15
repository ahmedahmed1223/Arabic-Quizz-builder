// ============================================================
// tests/unit/setup.js — Vitest global setup
// Runs before each test file. Provides browser-like globals that
// the IIFE-based codebase expects (window, document, localStorage, etc.)
// ============================================================

import { vi, beforeEach, afterEach } from 'vitest';

// ── jsdom provides window, document, localStorage, etc. ──
// We just need to ensure a few extra globals the app uses are defined.

// BroadcastChannel — jsdom doesn't provide it
if (typeof globalThis.BroadcastChannel === 'undefined') {
  class BroadcastChannelMock {
    constructor(name) {
      this.name = name;
      this._listeners = new Set();
      BroadcastChannelMock._channels.set(name, this);
    }
    postMessage(msg) {
      // Echo to all other instances on the same channel name
      for (const ch of BroadcastChannelMock._channels.values()) {
        if (ch !== this && ch.name === this.name) {
          for (const listener of ch._listeners) {
            try { listener({ data: msg, origin: 'mock' }); } catch (_) {}
          }
        }
      }
    }
    addEventListener(_type, listener) { this._listeners.add(listener); }
    removeEventListener(_type, listener) { this._listeners.delete(listener); }
    close() {
      this._listeners.clear();
      BroadcastChannelMock._channels.delete(this.name);
    }
  }
  BroadcastChannelMock._channels = new Map();
  globalThis.BroadcastChannel = BroadcastChannelMock;
}

// IndexedDB — fake-in-memory implementation for unit tests
// (the real fake-indexeddb package can be used for integration tests)
if (typeof globalThis.indexedDB === 'undefined') {
  const _store = new Map();
  globalThis.indexedDB = {
    open(name, version) {
      const req = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: (name) => ({
            put: (val, key) => {
              _store.set(key, val);
              return { onsuccess: null, onerror: null };
            },
            get: (key) => {
              const val = _store.get(key);
              const r = { onsuccess: null, onerror: null, result: val };
              setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: r }); }, 0);
              return r;
            },
            getAll: () => {
              const all = Array.from(_store.values());
              const r = { onsuccess: null, onerror: null, result: all };
              setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: r }); }, 0);
              return r;
            },
            getAllKeys: () => {
              const keys = Array.from(_store.keys());
              const r = { onsuccess: null, onerror: null, result: keys };
              setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: r }); }, 0);
              return r;
            },
            delete: (key) => {
              _store.delete(key);
              return { onsuccess: null, onerror: null };
            },
          }),
          transaction: (storeName, mode) => {
            const objStore = req.result.createObjectStore(storeName);
            return {
              objectStore: () => objStore,
              oncomplete: null,
              onerror: null,
              abort: () => {},
            };
          },
          close: () => {},
        },
      };
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }); }, 0);
      return req;
    },
  };
}

// Web Crypto API — jsdom doesn't provide it
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    subtle: {
      digest: async (algorithm, data) => {
        // Simple non-cryptographic hash for tests (NOT for production)
        const text = new TextDecoder().decode(data);
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = ((hash << 5) - hash) + text.charCodeAt(i);
          hash |= 0;
        }
        const buf = new ArrayBuffer(32);
        const view = new DataView(buf);
        view.setInt32(0, hash);
        return buf;
      },
    },
  };
}

// matchMedia — jsdom doesn't provide it
if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Reset DOM and storage between tests to prevent state leakage
beforeEach(() => {
  if (typeof localStorage !== 'undefined' && localStorage.clear) localStorage.clear();
  if (typeof sessionStorage !== 'undefined' && sessionStorage.clear) sessionStorage.clear();
});

afterEach(() => {
  // Restore any mocked functions
  vi.restoreAllMocks();
});
