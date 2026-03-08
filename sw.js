// FotoMontana Service Worker — offline-first PWA
const CACHE = 'fotomontana-v1';

const STATIC = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

const CDN = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache local assets immediately
      cache.addAll(STATIC).catch(() => {});
      // Cache CDN assets (best effort — may fail if offline at install time)
      CDN.forEach(url => {
        fetch(url, { mode: 'no-cors' })
          .then(res => cache.put(url, res))
          .catch(() => {});
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', e => {
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET' || e.request.url.startsWith('chrome-extension')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: return main app for navigation requests
          if (e.request.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
