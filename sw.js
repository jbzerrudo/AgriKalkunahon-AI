/* AgriKalkunahon-AI service worker.
   The page, its manifest and its icons are kept so that the app opens with no signal. Nothing else is
   handled here. The AI server is reached over the network or not at all. AgriKalkunahon's calculations,
   shown inside this page, are kept on the phone by AgriKalkunahon's own service worker. */
const SHELL = 'akai-shell-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png?v=2', './icon-512.png?v=2', './icon-maskable-512.png?v=2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

/* Older copies of this app's files are removed, and so is the AI library that version 0.1 kept
   ("akai-lib"), which this version does not use. */
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('akai-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  /* The page: network first, so an update reaches the phone, and the kept copy when there is no signal. */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(SHELL).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  /* This app's own icons and manifest: the kept copy first. */
  if (req.url.startsWith(self.registration.scope)) e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
