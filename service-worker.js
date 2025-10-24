// service-worker.js  (umiestnite do rovnakého folderu ako index.html)
const CACHE_NAME = 'sync-mp3-cache-v2';

// RELATÍVNE cesty (dôležité pre GitHub Pages / repo subpath)
const PRECACHE_URLS = [
  './',                 // koreň v scope (index)
  './index.html',
  './audio/test.mp3'    // pridajte sem všetky mp3, ktoré chcete mať dostupné offline
];

// Install -> prednačítanie
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate -> vyčistenie starých cache a prevzatie kontroly
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve())
    ))
    .then(() => self.clients.claim())
  );
});

// Fetch -> preferuj cache, pre navigácie vráť index.html (SPA-fallback)
self.addEventListener('fetch', event => {
  const req = event.request;

  // iba GET požiadavky
  if (req.method !== 'GET') return;

  // Ak ide o navigačnú požiadavku (reload / vstup do stránky), vrátiť index.html z cache ak existuje
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        if (cached) return cached;
        return fetch(req).catch(() => caches.match('./')); // fallback na './'
      })
    );
    return;
  }

  // Pre iné požiadavky: cache-first so zapísaním do runtime cache ak nie je
  event.respondWith(
    caches.match(req).then(cachedResp => {
      if (cachedResp) return cachedResp;
      return fetch(req).then(networkResp => {
        // ak platná odpoveď, ulož do cache
        if (!networkResp || networkResp.status !== 200) return networkResp;
        const cloned = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, cloned));
        return networkResp;
      }).catch(() => {
        // pri sietovej chybe: ak je to audio, možno vrátiť cached fallback, alebo index
        return caches.match('./index.html');
      });
    })
  );
});
