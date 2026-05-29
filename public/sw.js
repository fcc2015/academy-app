// Service Worker — DB Admin Academy PWA
// يخلي التطبيق يخدم offline + يكاشي الأصول الثابتة فقط
// لا يكاشي HTML/JS/CSS بش متبقاش versions قديمة fl navigateur

const CACHE_NAME = 'dbadmin-academy-v4';
const STATIC_ASSETS = [
    '/logo.png',
    '/manifest.json'
];

// التثبيت — كاشي الملفات الثابتة فقط
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// التفعيل — حذف كل كاش قديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// الطلبات — كاشي ghir static assets (png, svg, manifest)
// HTML و JS و CSS ghadi ymchiou direct li navigateur (no SW caching)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network-only for everything except static image assets
    const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)$/i.test(url.pathname)
        || url.pathname === '/manifest.json';

    if (!isStaticAsset || event.request.method !== 'GET') {
        return; // let browser handle it natively
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});

// Push Event: Handle notifications sent by backend
self.addEventListener('push', (event) => {
    let data = { title: 'أكاديمية Akmil', body: 'تنبيه جديد!' };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error('Error parsing push data', e);
        if (event.data) {
            data = { title: 'أكاديمية Akmil', body: event.data.text() };
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/logo.png',
        badge: data.badge || '/logo.png',
        data: data.data || { url: '/' },
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click: Open URL or focus existing window
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    let urlToOpen = '/';
    if (event.notification.data && event.notification.data.url) {
        urlToOpen = event.notification.data.url;
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Try to find a window with the same URL and focus it
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.endsWith(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window found, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
