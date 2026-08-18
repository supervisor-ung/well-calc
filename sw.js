/* ================================================================
   Сервис-воркер: приложение работает офлайн и само обновляется.

   Стратегия:
   - index.html и manifest.json — сначала сеть, при её отсутствии кэш.
     Значит новая версия приезжает сама при первом запуске со связью.
   - иконки — сразу из кэша, они не меняются.

   ВАЖНО: менять номер версии ниже при каждой правке приложения.
   ================================================================ */
const CACHE = 'well-calc-v22';
const FILES = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-1024.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('index.html')
    || url.pathname.endsWith('manifest.json');

  if (isPage) {
    // сначала сеть — чтобы обновление приезжало само
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
    );
  } else {
    // остальное — из кэша
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
  }
});
