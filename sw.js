// Minimal app-shell service worker. Only caches the site's own top-level
// pages/assets (not games/files/** or third-party origins) so it can't
// interfere with individual game code, Ruffle, AdSense, or Supabase.
// Strategy: network-first with a cache fallback, so a stale cache never
// outlives a real deploy for someone with a working connection, but the
// shell still loads offline / on a flaky connection.
const CACHE_NAME = 'nq-shell-v1';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/game.html',
  '/css/style.css',
  '/js/games-data.js',
  '/js/site.js',
  '/js/player.js',
  '/js/theme.js',
  '/js/theme-init.js',
  '/games/games.json',
  '/favicon.svg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // leave ads/Supabase/fonts alone
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/games/files/')) return; // never intercept game code

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
