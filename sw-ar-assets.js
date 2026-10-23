const NATIVE_AR_ASSET_CACHE = 'mbg_native_ar_assets_v1';
const NATIVE_AR_PATH_FRAGMENT = '/__mbg_ar_assets/';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes(NATIVE_AR_PATH_FRAGMENT)) return;

  event.respondWith((async () => {
    const cache = await caches.open(NATIVE_AR_ASSET_CACHE);
    const hit = await cache.match(event.request, { ignoreSearch: false });
    if (hit) return hit;
    return new Response('Native AR asset not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});
