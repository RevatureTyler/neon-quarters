// Registers the app-shell service worker (see sw.js). Safe to include on
// every page; no-ops on browsers without SW support and never blocks render.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
