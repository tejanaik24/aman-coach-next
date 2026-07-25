const CACHE_NAME = "ak-coach-v1"
const OFFLINE_URLS = [
  "/",
  "/home",
  "/workout",
  "/nutrition",
  "/progress",
  "/checkin",
  "/manifest.json",
  "/images/aman/aman-01.jpeg",
  "/images/aman/aman-02.jpeg",
  "/images/aman/aman-03.jpeg"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS)
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy))
        }
        return networkResponse
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match("/home")
        })
      })
  )
})
