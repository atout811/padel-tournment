export const registerPwaServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  const baseUrl = import.meta.env.BASE_URL || '/';

  if (import.meta.env.DEV) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => registration.scope.includes(baseUrl))
            .map((registration) => registration.unregister())
        )
      )
      .catch((error) => {
        console.error('Service worker cleanup failed:', error);
      });

    if ('caches' in window) {
      caches
        .keys()
        .then((cacheNames) => Promise.all(cacheNames.filter((name) => name.startsWith('padel-night')).map((name) => caches.delete(name))))
        .catch((error) => {
          console.error('Cache cleanup failed:', error);
        });
    }
    return;
  }

  navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl }).catch((error) => {
    console.error('Service worker registration failed:', error);
  });
};
