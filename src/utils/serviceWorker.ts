/**
 * Service Worker utilities for PWA features and offline support
 * Provides caching, background sync, and performance optimizations
 */

export interface CacheConfig {
  version: string
  staticAssets: string[]
  audioAssets: string[]
  apiEndpoints: string[]
  maxAge: number
}

export interface SyncTask {
  id: string
  type: string
  data: unknown
  timestamp: number
  retries: number
}

/**
 * Service Worker manager for PWA functionality
 */
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private isSupported = 'serviceWorker' in navigator

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager()
    }
    return ServiceWorkerManager.instance
  }

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Service Worker not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('Service Worker registered:', this.registration.scope)

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification()
            }
          })
        }
      })

      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update()
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  /**
   * Show update notification to user
   */
  private showUpdateNotification(): void {
    const event = new CustomEvent('sw-update-available', {
      detail: {
        update: () => this.skipWaiting(),
        dismiss: () => console.log('Update dismissed')
      }
    })
    window.dispatchEvent(event)
  }

  /**
   * Add task for background sync
   */
  async addBackgroundSyncTask(type: string, data: unknown): Promise<void> {
    if (!this.registration?.sync) {
      console.warn('Background Sync not supported')
      return
    }

    const task: SyncTask = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    }

    // Store task in IndexedDB
    await this.storeSyncTask(task)

    // Register background sync
    try {
      await this.registration.sync.register(type)
    } catch (error) {
      console.error('Background sync registration failed:', error)
    }
  }

  /**
   * Store sync task in IndexedDB
   */
  private async storeSyncTask(task: SyncTask): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('keplear-sync', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['sync-tasks'], 'readwrite')
        const store = transaction.objectStore('sync-tasks')

        store.add(task)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('sync-tasks')) {
          db.createObjectStore('sync-tasks', { keyPath: 'id' })
        }
      }
    })
  }

  /**
   * Get network status
   */
  isOnline(): boolean {
    return navigator.onLine
  }

  /**
   * Check if resource is cached
   */
  async isCached(url: string): Promise<boolean> {
    try {
      const cache = await caches.open('keplear-v1')
      const response = await cache.match(url)
      return !!response
    } catch {
      return false
    }
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalResources(urls: string[]): Promise<void> {
    if (!this.registration) return

    this.registration.active?.postMessage({
      type: 'PRELOAD_RESOURCES',
      urls
    })
  }
}

/**
 * Generate service worker code
 */
export function generateServiceWorkerCode(config: CacheConfig): string {
  return `
const CACHE_VERSION = '${config.version}';
const STATIC_CACHE = 'keplear-static-' + CACHE_VERSION;
const AUDIO_CACHE = 'keplear-audio-' + CACHE_VERSION;
const API_CACHE = 'keplear-api-' + CACHE_VERSION;

const STATIC_ASSETS = ${JSON.stringify(config.staticAssets)};
const AUDIO_ASSETS = ${JSON.stringify(config.audioAssets)};
const API_ENDPOINTS = ${JSON.stringify(config.apiEndpoints)};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(AUDIO_CACHE).then(cache => cache.addAll(AUDIO_ASSETS))
    ]).then(() => {
      console.log('Assets cached successfully');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName =>
            cacheName.startsWith('keplear-') &&
            !cacheName.includes(CACHE_VERSION)
          )
          .map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('Old caches cleaned up');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // API requests - Network First with fallback
  if (API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Audio assets - Cache First with network fallback
  if (AUDIO_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(cacheFirstStrategy(request, AUDIO_CACHE));
    return;
  }

  // Static assets - Cache First
  if (STATIC_ASSETS.some(asset => url.pathname.includes(asset))) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network First with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'melody-save') {
    event.waitUntil(syncMelodies());
  } else if (event.tag === 'analytics') {
    event.waitUntil(syncAnalytics());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New melody available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'keplear-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Keplear', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'PRELOAD_RESOURCES':
      event.waitUntil(preloadResources(data.urls));
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
  }
});

// Caching strategies
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Return cached version and update in background
      updateCacheInBackground(request, cache);
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;

  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.log('Network failed, trying cache:', error.message);

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return cache.match('/offline.html') ||
        new Response('Offline', { status: 503 });
    }

    return new Response('Offline - Resource not available', { status: 503 });
  }
}

async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('Background cache update failed:', error.message);
  }
}

async function preloadResources(urls) {
  const cache = await caches.open(STATIC_CACHE);

  const preloadPromises = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('Failed to preload:', url, error.message);
    }
  });

  await Promise.allSettled(preloadPromises);
  console.log('Preload completed for', urls.length, 'resources');
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames
    .filter(name => name.startsWith('keplear-'))
    .map(name => caches.delete(name));

  await Promise.all(deletePromises);
  console.log('All caches cleared');
}

async function syncMelodies() {
  try {
    // Get pending melodies from IndexedDB
    const db = await openSyncDatabase();
    const melodies = await getSyncTasks(db, 'melody-save');

    for (const task of melodies) {
      try {
        await fetch('/api/melodies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.data)
        });

        // Remove successful task
        await removeSyncTask(db, task.id);
        console.log('Melody synced successfully:', task.id);

      } catch (error) {
        console.error('Failed to sync melody:', task.id, error);

        // Increment retry count
        task.retries = (task.retries || 0) + 1;

        // Remove if too many retries
        if (task.retries > 3) {
          await removeSyncTask(db, task.id);
        } else {
          await updateSyncTask(db, task);
        }
      }
    }

  } catch (error) {
    console.error('Sync melodies failed:', error);
  }
}

async function syncAnalytics() {
  try {
    // Get pending analytics from IndexedDB
    const db = await openSyncDatabase();
    const analytics = await getSyncTasks(db, 'analytics');

    if (analytics.length > 0) {
      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analytics.map(task => task.data))
      });

      // Remove all analytics tasks
      for (const task of analytics) {
        await removeSyncTask(db, task.id);
      }

      console.log('Analytics synced successfully:', analytics.length, 'events');
    }

  } catch (error) {
    console.error('Sync analytics failed:', error);
  }
}

function openSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('keplear-sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sync-tasks')) {
        db.createObjectStore('sync-tasks', { keyPath: 'id' });
      }
    };
  });
}

function getSyncTasks(db, type) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-tasks'], 'readonly');
    const store = transaction.objectStore('sync-tasks');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const tasks = request.result.filter(task => task.type === type);
      resolve(tasks);
    };
  });
}

function removeSyncTask(db, taskId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-tasks'], 'readwrite');
    const store = transaction.objectStore('sync-tasks');
    const request = store.delete(taskId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function updateSyncTask(db, task) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-tasks'], 'readwrite');
    const store = transaction.objectStore('sync-tasks');
    const request = store.put(task);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('Service Worker loaded successfully');
  `
}

/**
 * Hook for using service worker features
 */
export function useServiceWorker() {
  const sw = ServiceWorkerManager.getInstance()

  const register = useCallback(() => sw.register(), [])
  const update = useCallback(() => sw.update(), [])
  const addSyncTask = useCallback((type: string, data: unknown) =>
    sw.addBackgroundSyncTask(type, data), [])

  return {
    register,
    update,
    addSyncTask,
    isOnline: sw.isOnline(),
    isSupported: 'serviceWorker' in navigator
  }
}

// Export singleton
export const serviceWorkerManager = ServiceWorkerManager.getInstance()