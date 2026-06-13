const CACHE_NAME = 'padel-night-v1';

const getScopePath = () => new URL(self.registration.scope).pathname;

const coreAssets = () => {
  const scopePath = getScopePath();
  return [
    scopePath,
    `${scopePath}manifest.webmanifest`,
    `${scopePath}padel-icon.svg`,
    `${scopePath}pwa-icon-192.png`,
    `${scopePath}pwa-icon-512.png`,
    `${scopePath}pwa-maskable-512.png`,
  ];
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(coreAssets()))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(getScopePath(), copy));
          return response;
        })
        .catch(() => caches.match(getScopePath()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
