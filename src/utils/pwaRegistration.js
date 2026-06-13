export const registerPwaServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
};
