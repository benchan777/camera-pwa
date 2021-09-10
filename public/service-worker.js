const cacheName = 'cameraApp';
const version = '11';

// Cache all files in order to create the PWA
self.addEventListener('install', e => {
    self.skipWaiting();

    e.waitUntil(
        caches.open(cacheName)
        .then( cache => {
            console.log('creating PWA cache')
            return cache.addAll([
                './',
                './manifest.json',
                './controllers/routes.js',
                './images/apple-touch.png',
                './images/splash-screen.png',
                './scripts/camera.js',
                './scripts/coco-ssd.js',
                './scripts/show-images.js',
                './scripts/tensorflow.js',
                './styles/styles.css',
                './views/layouts/main.handlebars',
                './views/home.handlebars',
                './views/show-photos.handlebars'
            ]);
        })
    );
});

//
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then( response => {
            if (response) {
                return response;
            }

            return fetch(event.request)
            .then( response => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                var responseToCache = response.clone();

                caches.open(cacheName)
                .then( cache => {
                    cache.put(event.request, responseToCache)
                })

                return response;
            })
        })
    )
})