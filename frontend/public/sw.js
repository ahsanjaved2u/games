const CACHE = 'gamevesta-v2';
const GAME_CACHE = 'gamevesta-games-v1';

// File extensions worth caching for games
const GAME_ASSET_EXTS = /\.(js|css|html|png|jpg|jpeg|webp|svg|woff2|woff|ttf|mp3|ogg|wav|json)$/i;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/offline']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== GAME_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // ── Game assets: cache-first strategy ──
  // Matches R2 URLs (*.r2.dev) and local game paths (/games/**/*)
  const isGameAsset =
    (url.hostname.endsWith('.r2.dev') || url.pathname.startsWith('/games/')) &&
    GAME_ASSET_EXTS.test(url.pathname);

  if (isGameAsset) {
    e.respondWith(
      caches.open(GAME_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          // Stale-while-revalidate: serve cached instantly, fetch fresh in background
          const fetchPromise = fetch(e.request).then((response) => {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          }).catch(() => cached); // if network fails, fall back to cache

          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // ── Navigation: network-first with offline fallback ──
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/offline').then((r) => r || caches.match('/')))
    );
    return;
  }
});

// ── Listen for prefetch messages from the app ──
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'PREFETCH_GAME') {
    const gameUrl = e.data.url; // e.g. "https://...r2.dev/plasmaburst/index.html"
    caches.open(GAME_CACHE).then((cache) =>
      cache.match(gameUrl).then((existing) => {
        if (!existing) fetch(gameUrl).then((res) => { if (res.ok) cache.put(gameUrl, res); }).catch(() => {});
      })
    );
  }
});
