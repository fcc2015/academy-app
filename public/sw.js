// Service Worker — DB Admin Academy PWA
// يخلي التطبيق يخدم offline + يكاشي الملفات

const CACHE_NAME = 'dbadmin-academy-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/logo.png',
    '/manifest.json'
];

// التثبيت — كاشي الملفات الأساسية
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// التفعيل — حذف كاش القديم
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// الطلبات — Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // تجاهل طلبات API — لازم تمشي للسيرفر دائماً
    if (event.request.url.includes('/api/') || 
        event.request.url.includes('supabase') ||
        event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // حفظ نسخة في الكاش
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // إذا ما كانش انترنت — جيب من الكاش
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    // إذا حتى الكاش ما فيهش — ارجع الـ index.html (SPA fallback)
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
