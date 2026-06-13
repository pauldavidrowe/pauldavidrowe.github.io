/**
 * Minimal service worker — required for PWA installability.
 *
 * Strategy:
 *  - network-first for recipe data AND for the app shell (navigation
 *    requests / index.html), falling back to cache when offline. This is
 *    what lets a fresh deploy show up on the very next load instead of
 *    requiring a cache-bump dance — the new index.html (with new hashed
 *    asset URLs) is fetched as soon as the network is available.
 *  - cache-first for hashed JS/CSS assets (their filenames change whenever
 *    their content does, so a cached copy is always valid).
 *
 * Bump CACHE whenever this file changes, so the old cache gets cleaned up
 * on activate.
 */

const CACHE = 'recipe-dag-v4'

const APP_SHELL = [
  './',
  './index.html',
]

// ── Install: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Network-first for recipe data, falling back to cache when offline
  if (url.pathname.includes('/data/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Network-first for the app shell (navigations and index.html) — always
  // prefer the latest HTML so a fresh deploy's asset URLs are picked up
  // immediately, falling back to cache when offline.
  const isAppShell = request.mode === 'navigate' || url.pathname.endsWith('/index.html')
  if (isAppShell) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    )
    return
  }

  // Cache-first for everything else (hashed JS/CSS/image assets)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        // Only cache successful same-origin responses
        if (
          response.ok &&
          response.type === 'basic' &&
          request.method === 'GET'
        ) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      })
    })
  )
})
