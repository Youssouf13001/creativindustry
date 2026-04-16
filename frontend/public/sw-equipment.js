/* Service Worker for Equipment Checklist Offline Mode */

const CACHE_NAME = 'creativindustry-equipment-v1';
const STATIC_ASSETS = [
  '/',
  '/admin/equipment',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/equipment',
  '/api/equipment/categories',
  '/api/deployments'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // API requests - network first, then cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok && shouldCacheAPI(url.pathname)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', url.pathname);
              return cachedResponse;
            }
            // Return offline message for API
            return new Response(
              JSON.stringify({ error: 'Offline - Données non disponibles' }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }
  
  // Static assets - cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }
      
      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback for pages
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Check if API endpoint should be cached
function shouldCacheAPI(pathname) {
  return API_CACHE_URLS.some(url => pathname.includes(url));
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Cache deployment data for offline use
  if (event.data && event.data.type === 'CACHE_DEPLOYMENT') {
    const { deploymentId, data } = event.data;
    caches.open(CACHE_NAME).then((cache) => {
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(`/api/deployments/${deploymentId}`, response);
      console.log('[SW] Cached deployment:', deploymentId);
    });
  }
});

// Background sync for pending signatures
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-signatures') {
    event.waitUntil(syncPendingSignatures());
  }
});

async function syncPendingSignatures() {
  // Get pending signatures from IndexedDB and sync them
  console.log('[SW] Syncing pending signatures...');
  // Implementation would require IndexedDB
}
