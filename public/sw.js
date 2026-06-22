const CACHE_NAME = "ak-fitness-v2"

const urlsToCache = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/client/dashboard",
  "/client/workout",
  "/client/diet",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API routes - Network First
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then((r) => r || new Response(JSON.stringify({ offline: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })))
    )
    return
  }

  // Static assets and pages - Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      }).catch(() => {
        // Offline fallback
        if (request.mode === "navigate") {
          return caches.match("/")
        }
        return new Response("Offline", { status: 503 })
      })
    })
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  )
})
