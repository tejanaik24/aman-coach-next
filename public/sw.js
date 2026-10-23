const CACHE_NAME = "ak-coach-v27";
const OFFLINE_URLS = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/images/aman/logo-large.webp",
  "/images/aman/logo-nav.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Leave other sites (Google Fonts, Supabase, Razorpay) to the browser
  if (url.origin !== self.location.origin) return;
  // Never cache API endpoints or Next data requests in SW
  if (url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          // Cache static assets only (JS chunks, images, icons, manifest)
          const isStatic =
            url.pathname.startsWith("/_next/static/") ||
            url.pathname.startsWith("/images/") ||
            url.pathname.startsWith("/icons/") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".webp") ||
            url.pathname.endsWith(".svg");
          if (isStatic) {
            const cacheCopy = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, cacheCopy));
          }
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("/home");
          }
          return undefined;
        });
      }),
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "Aman Coach";
  const options = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url ?? "/home" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = event.notification.data?.url ?? "/home";
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client)
          return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
