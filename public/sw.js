// Service Worker for caching and offline functionality
const CACHE_NAME = 'wholesale-mobile-home-v1.2';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external requests (except for images)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && !url.hostname.includes('unsplash.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response before caching
          const responseToCache = response.clone();
          
          // Cache images and static assets
          if (
            event.request.destination === 'image' ||
            event.request.url.includes('/assets/') ||
            event.request.url.endsWith('.js') ||
            event.request.url.endsWith('.css')
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // Return offline fallback for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
    })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Handle any queued operations when connection is restored
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New update available',
      icon: '/images/icon-192x192.png',
      badge: '/images/icon-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'wholesale-mobile-home',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Wholesale Mobile Home', options)
    );
  }
});
