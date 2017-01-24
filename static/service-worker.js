self.addEventListener('install', function(event) {
  event.waitUntil(
    caches
      .open('v1')
      .then(function(cache) {
        return cache.addAll([
          '.',
          'favicon.ico',
          'manifest.json',
          'img/code.png',
          'img/coffee.png',
          'img/logo16.png',
          'img/logo32.png',
          'img/logo48.png',
          'img/logo62.png',
          'img/logo72.png',
          'img/logo96.png',
          'img/logo144.png',
          'img/logo168.png',
          'img/logo192.png',
          'audio/alarm.mp3'
        ]).then(function() {
          self.skipWaiting()
        })
      })
  )
})

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request)
    })
  )
})
