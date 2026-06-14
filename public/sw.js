/**
 * AlwaysOnTopNotes service worker — REAL offline app-shell (Phase 4 · commit 16,
 * Decision B). AOTN is the opposite of the install-only default: an IndexedDB
 * notes app that's genuinely useful with no network and "always visible while
 * you work" wants to survive dead wifi. So we precache the shell + hashed
 * bundles and serve them offline.
 *
 * BUILD_ID + PRECACHE_URLS are placeholders rewritten at build time by the
 * `aotn-sw-precache` integration in astro.config.mjs (globs dist/_astro/* and
 * injects a content-derived id). The cache name embeds BUILD_ID so every deploy
 * whose bundles changed rotates the cache and `activate` purges the old one —
 * no stale-Worker class (see cloudflare-pages-worker-version-cachebust skill).
 *
 * In `npm run dev` the placeholders are NOT replaced; precache uses allSettled
 * so the bogus sentinel URL fails silently and never blocks install.
 */
const BUILD_ID = "__BUILD_ID__";
const PRECACHE_URLS = ["__PRECACHE_PLACEHOLDER__"];
const CACHE_NAME = `aotn-${BUILD_ID}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // allSettled: a single 404 (or the dev sentinel) must not abort install.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("aotn-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  // Pass through cross-origin (Google Fonts, GA) — never break analytics or
  // let an opaque response poison the cache. Offline, fonts fall back to system.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

// Navigations: network-first (always try for the freshest HTML / latest fixes),
// fall back to the cached page, then the cached app, then the offline page.
async function navigationHandler(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match(new URL(request.url).pathname)) ||
      (await cache.match("/app")) ||
      (await cache.match(OFFLINE_URL)) ||
      Response.error()
    );
  }
}

// Static assets (hashed _astro/*, icons, svg): cache-first; the bundles are
// content-hashed + immutable, so a hit is always correct. Cache the network
// response on first miss so the next visit is offline-ready.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && fresh.type === "basic") {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return cached || Response.error();
  }
}
