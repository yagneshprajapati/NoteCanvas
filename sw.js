// Service Worker for offline support
const CACHE_NAME = "notecanvas-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/app.js",
  "./js/canvas.js",
  "./js/encryption.js",
  "./js/notes.js",
  "./js/storage.js",
  "./js/ui.js",
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});
