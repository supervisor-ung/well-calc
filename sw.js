/* Памятка бурового супервайзера — офлайн-режим
   При каждом обновлении index.html меняйте номер в CACHE — старый кэш удалится сам. */
const CACHE = 'well-calc-v33';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-1024.png',
  './apple-touch-icon.png'
];

/* установка: кладём файлы в кэш; отсутствующий файл не срывает установку */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(FILES.map(f => c.add(f).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

/* активация: удаляем все старые кэши, в том числе well-calc-v31 */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* YouTube и прочее — мимо кэша */

  /* страница: сначала сеть (чтобы приходили обновления), без сети — из кэша */
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() =>
        caches.match('./index.html').then(r => r || caches.match(req, { ignoreSearch: true }))
      )
    );
    return;
  }

  /* иконки, манифест: сначала кэш, потом сеть */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
