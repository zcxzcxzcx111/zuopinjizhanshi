// Self-destruct: unregister this service worker and clear ALL caches
// This runs once to clean up all previously cached content

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Delete every single cache that exists
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
  );
});

// Pass all fetches through to network — no caching whatsoever
self.addEventListener('fetch', () => {});
