self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Za prvi MVP ne radimo agresivan cache.
  // Kasnije ovde možeš dodati offline cache.
});