const CACHE_NAME = "abraham-g4-marvel-hub-v35";
const ARCHIVOS = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./video-ai.js","./video-ai-audio.js","./video-ai-render.js","./video-ai-audio.css","./video-ai-render.css",
    "./manifest.json",
    "./icon-192.svg",
    "./icon-512.svg"
];

self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ARCHIVOS);
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(claves) {
            return Promise.all(
                claves
                    .filter(function(clave) {
                        return clave !== CACHE_NAME;
                    })
                    .map(function(clave) {
                        return caches.delete(clave);
                    })
            );
        })
    );

    self.clients.claim();
});

self.addEventListener("fetch", function(event) {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(function(respuesta) {
                const copia = respuesta.clone();

                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, copia);
                });

                return respuesta;
            })
            .catch(function() {
                return caches.match(event.request);
            })
    );
});
