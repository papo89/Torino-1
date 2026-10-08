/* Service worker della guida: pagina disponibile offline e tessere della mappa in cache. */
const CORE = 'torino-core-v1';
const TILES = 'torino-tiles-v1';
const FONTS = 'torino-fonts-v1';
const CORE_FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const MAX_TILES = 900;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  const keep = [CORE, TILES, FONTS];
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) {
    const c = await caches.open(name);
    c.put(req, res.clone());
    if (name === TILES && Math.random() < 0.05) trim(TILES, MAX_TILES);
  }
  return res;
}
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) (await caches.open(CORE)).put(req, res.clone());
    return res;
  } catch (err) {
    return (await caches.match(req)) || (await caches.match('./index.html'));
  }
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.hostname.endsWith('basemaps.cartocdn.com')) { e.respondWith(cacheFirst(req, TILES)); return; }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') { e.respondWith(cacheFirst(req, FONTS)); return; }
  if (u.origin === self.location.origin) e.respondWith(networkFirst(req));
});
