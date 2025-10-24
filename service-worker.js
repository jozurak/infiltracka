// service-worker.js
const CACHE_NAME = 'sync-mp3-cache-v2';
const PRECACHE_URLS = [
  '/',                 // ak je index.html v root
  '/index.html',       // ak váš súbor je nazvaný index.html
  '/audio/test.mp3',   // pridať sem všetky mp3, ktoré chcete precacheovať
  // '/audio/adam.mp3', '/audio/eva.mp3'  <-- pridajte ďalšie položky podľa tracks
];

// Install: prednačítanie požadovaných súborov
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: vyčisti staré cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch: preferuj cache, potom sieť (cache-first)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // iba GET requesty: nechceme zasahovať do POST atď.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      // ak nie je v cache, skúsi sieť a uloží do cache (runtime cache)
      return fetch(req).then(resp => {
        // ak nie je platná odpoveď, necháme ju prejsť
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
        return resp;
      }).catch(() => {
        // fallback: ak chcete, môžete vrátiť offline placeholder (tu nič)
        return caches.match('/index.html'); // aspoň načíta stránku offline
      });
    })
  );
});
