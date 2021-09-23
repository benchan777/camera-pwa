const cacheName = 'cameraApp';
const version = '26';

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
                './model/group1-shard1of7.bin',
                './model/group1-shard2of7.bin',
                './model/group1-shard3of7.bin',
                './model/group1-shard4of7.bin',
                './model/group1-shard5of7.bin',
                './model/group1-shard6of7.bin',
                './model/group1-shard7of7.bin',
                './model/model.json',
                './scripts/camera.js',
                './scripts/coco-ssd.js',
                './scripts/tensorflow.js',
                './styles/styles.css',
                './views/layouts/main.handlebars',
                './views/home.handlebars'
            ]);
        })
    );
});

// Load page from cache if cached version already exists
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