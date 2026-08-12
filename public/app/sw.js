const CACHE = "educato-2026-v2";
const ASSETS = [
  "/app/index.html",
  "/app/manifest.webmanifest",
  "/app/hero.jpg",
  "/app/icon-192.png",
  "/app/icon-512.png",
];


self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put("/app/index.html", res.clone()));
          return res;
        })
        .catch(() => caches.match("/app/index.html")),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res.clone();
          })
          .catch(() => hit),
    ),
  );
});
