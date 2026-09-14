/* ============================================================
   Памятка бурового супервайзера — service worker
   Стратегия: network-first для страницы, cache-first для статики.
   При каждом обновлении приложения поднимайте VERSION на единицу —
   это заставит браузер выкинуть старый кэш и забрать новый файл.
   ============================================================ */

const VERSION = 'v1';
const CACHE = 'well-calc-' + VERSION;

/* Пути относительные — приложение живёт в подкаталоге
   (github.io/well-calc/), абсолютные '/...' указали бы в корень домена. */
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ---------- установка ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      /* если одна иконка отсутствует — не валим всю установку */
      .catch(err => console.warn('SW: часть файлов не закэширована', err))
      .then(() => self.skipWaiting())
  );
});

/* ---------- активация: чистим старые версии ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- перехват запросов ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;

  /* Обрабатываем только GET своего origin: POST, запросы к другим
     доменам и расширения браузера пропускаем напрямую в сеть. */
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* Навигация (открытие страницы) — сначала сеть, чтобы пользователь
     сразу получал свежую версию; кэш подстрахует в офлайне. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* Остальная статика — сначала кэш, сеть как запасной вариант.
     Успешный ответ дописываем в кэш, чтобы он был доступен офлайн. */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

/* ---------- немедленное обновление по команде со страницы ---------- */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
