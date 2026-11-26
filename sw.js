/* SmartStock PWA v0.30 — public app shell only. */
const CACHE = 'smartstock-public-shell-v031';
const SHELL = ['./estoque.html', './estoque.js', './index.html', './demo.html', './portfolio.css', './portfolio.js', './operations.js', './preview.png', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('smartstock-public-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(SHELL.find(path => path.endsWith('.html') && new URL(path, self.registration.scope).pathname === url.pathname) || './index.html')));
    return;
  }
  const asset = SHELL.find(path => new URL(path, self.registration.scope).pathname === url.pathname);
  if (asset) event.respondWith(caches.match(asset).then(cached => cached || fetch(req)));
});
