const CACHE_NAME = 'padel-night-v2';

const getScopePath = () => new URL(self.registration.scope).pathname;

const coreAssets = () => {
  const scopePath = getScopePath();
  return [
    `${scopePath}index.html`,
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
      .then(async (cache) => {
        await Promise.allSettled(coreAssets().map((url) => cache.add(url)));
      })
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
          const scopePath = getScopePath();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(`${scopePath}index.html`, copy);
            cache.put(scopePath, copy);
          });
          return response;
        })
        .catch(async () => {
          const scopePath = getScopePath();
          return (await caches.match(`${scopePath}index.html`)) || caches.match(scopePath);
        })
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
