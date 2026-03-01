// DataDock Service Worker v1
// Caches the app shell so it loads instantly and works offline

const CACHE = 'datadock-v1';

// Everything needed to run the app — fetched once, served forever
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap'
];

// Install: cache everything upfront
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache what we can — don't fail if a CDN resource is unavailable
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(e => console.warn('Could not cache:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if(event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      // Not in cache — fetch from network and cache for next time
      return fetch(event.request).then(response => {
        if(!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Fully offline and not cached — return a friendly message for HTML requests
        if(event.request.headers.get('accept').includes('text/html')){
          return caches.match('./index.html');
        }
      });
    })
  );
});
