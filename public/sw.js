const CACHE_NAME = 'manager-v3';
const STATIC_ASSETS = [
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') return;

  const url = new URL(request.url);

  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/functions/') ||
    url.hostname.includes('supabase')
  ) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          try {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try { cache.put(request, clone); } catch {}
            });
          } catch {}
        }
        return response;
      })
      .catch(async () => {
        try {
          const cached = await caches.match(request);
          if (cached) return cached;
        } catch {}
        return new Response('', { status: 503, statusText: 'Offline' });
      })
  );
});
