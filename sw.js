const version = "font-Playground v1.0";

const cacheFiles = [
  "/",
  "./dist/script.js",
  "./dist/style.css",
  "./dist/favicon.svg",
  "./fonts/Recursive_VF_1.078.woff2",
];

let channel = new BroadcastChannel("varfont-refresh");

addEventListener("install", (installEvent) => {
  skipWaiting();

  installEvent.waitUntil(
    caches.open(version).then((GlyphsCache) => {
      return GlyphsCache.addAll(cacheFiles);
    })
  );
});

addEventListener("activate", (activateEvent) => {
  activateEvent.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        let cacheNameAry = cacheNames.filter((e) =>
          /font-playground/gi.test(e)
        );

        return Promise.all(
          cacheNameAry.map((cacheName) => {
            if (cacheName !== version) {
              caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => clients.claim())
      .then(() => channel.postMessage(`refresh`))
  );
});

addEventListener("fetch", (fetchEvent) => {
  const request = fetchEvent.request;
  fetchEvent.respondWith(
    caches.match(request).then((resFromCache) => {
      if (resFromCache) return resFromCache;
      return fetch(request);
    })
  );
});
