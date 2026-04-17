/* ═══════════════════════════════════════════════════════
   DIA TRABALHADO — sw.js (Service Worker)
   Cache offline para instalação como PWA
═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'dia-trabalhado-v1';

// Arquivos que serão cacheados na instalação
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  // Fonte do Google Fonts (opcional — funciona se já foi visitado antes)
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap',
];

/* ── Install: pré-carrega o cache ─────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets...');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Falha ao cachear algum asset:', err);
      });
    })
  );
  self.skipWaiting();
});

/* ── Activate: limpa caches antigos ──────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Removendo cache antigo:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: cache-first, fallback para rede ──────── */
self.addEventListener('fetch', event => {
  // Ignora requisições não-GET e extensões do Chrome
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Somente cacheia respostas válidas
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: retorna index.html para navegação
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
