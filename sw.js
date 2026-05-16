// =============================================
// Math Royale — Service Worker
// Versi: 1.0.0
// =============================================

const CACHE_NAME    = 'mathroyale-v1';
const OFFLINE_PAGE  = './offline.html';

// File yang di-cache saat install (app shell)
const PRECACHE_URLS = [
  './per1_chest.html',
  './manifest.json',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ---- INSTALL: cache app shell ----
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Precache partial fail (OK jika file belum ada):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE: hapus cache lama ----
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Hapus cache lama:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH: strategi Network-First dengan fallback cache ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip request cross-origin (Firebase, CDN, API) — biarkan langsung ke network
  if (url.origin !== location.origin) return;

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Simpan ke cache kalau response valid
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: coba dari cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Kalau tidak ada di cache, tampilkan halaman offline
          if (event.request.destination === 'document') {
            return caches.match(OFFLINE_PAGE);
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// ---- PUSH NOTIFICATION (siap dipakai nanti) ----
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Math Royale';
  const opts  = {
    body: data.body || 'Ada notifikasi baru!',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' },
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || './')
  );
});
