/* AgriKalkunahon-AI service worker.
   The page and its icons are kept so the app opens with no signal. The AI library, served from jsDelivr
   at a pinned version, is kept too. The AI model itself is not handled here: Transformers.js stores it in
   its own cache ("transformers-cache") the first time it is downloaded, so it is left alone. */
const SHELL = 'akai-shell-v1';
const LIB = 'akai-lib';   // URLs there carry their version, so this cache never needs clearing
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('akai-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* The page: network first, so an update reaches the phone, and the kept copy when there is no signal. */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(SHELL).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  /* Icons and manifest: kept copy first. */
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  /* The AI library and its runtime, from jsDelivr: kept copy first, stored on first use. */
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(LIB).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
  }
  /* Everything else, including the model files from Hugging Face, goes to the network as usual. */
});
