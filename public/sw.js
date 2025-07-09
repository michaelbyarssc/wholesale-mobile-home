// Service Worker for Wholesale Mobile Home PWA
const CACHE_NAME = 'wmh-cache-v1';
const STATIC_CACHE_NAME = 'wmh-static-v1';
const DYNAMIC_CACHE_NAME = 'wmh-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
];

// Cache-first strategy for these file types
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:css|js)$/,
  /fonts\//
];

// Network-first strategy for these patterns
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /supabase/,
  /auth/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for API calls and auth
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirst(request);
    }
    
    // Cache-first strategy for static assets
    if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await cacheFirst(request);
    }
    
    // Stale-while-revalidate for everything else
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.error('[SW] Request failed:', error);
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const cachedResponse = await caches.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return a basic offline response
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Start network request regardless of cache hit/miss
  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Network request failed:', error);
      return null;
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    console.log('[SW] Serving from cache while revalidating:', request.url);
    return cachedResponse;
  }
  
  // Wait for network response if no cache hit
  return networkResponsePromise || new Response('Network Error', { status: 503 });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  // Handle offline actions when connection is restored
  // This could include syncing cart items, wishlists, etc.
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New mobile homes available!',
      icon: '/images/icon-192x192.png',
      badge: '/images/icon-72x72.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'View Details',
          icon: '/images/icon-72x72.png'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Wholesale Mobile Home', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});