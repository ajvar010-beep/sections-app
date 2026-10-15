/* Service worker PWA «Сечения многогранников».
 *
 * Задача одна: приложение должно работать БЕЗ интернета.
 * При установке кладём все свои файлы в кэш. Дальше:
 *   - открытие страницы — сначала сеть (чтобы получать обновления),
 *     сеть недоступна — берём из кэша;
 *   - остальные файлы (иконки, манифест) — всегда из кэша.
 * Внешних запросов нет и быть не может: в index.html ноль внешних ссылок,
 * а чужие origin этот worker не обслуживает (проверка url.origin).
 *
 * Синтаксис намеренно ES5 — как весь остальной мобильный код.
 */
'use strict';

var CACHE = 'sections-ve7fb3fe5ed';
var PRECACHE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) { return caches.delete(k); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') { return; }
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) { return; }  // чужие — не трогаем

  if (e.request.mode === 'navigate') {
    // сеть → кэш: онлайн страница обновляется, офлайн берётся сохранённая
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (cache) { cache.put('./index.html', copy); });
        }
        return resp;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  // остальное — сначала кэш
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) { return hit; }
      return fetch(e.request).then(function (resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, copy); });
        }
        return resp;
      });
      /* без сети и без кэша — ошибка запроса, как и должна быть */
    })
  );
});
