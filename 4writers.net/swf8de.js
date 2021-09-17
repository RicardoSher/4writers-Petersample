var pwaCacheName = "PWACache";

var pwaFilesToCache = [
 "/"
];

self.addEventListener("install", function(event) {
 event.waitUntil(caches.open(pwaCacheName).then(function(cache) {
  if (pwaFilesToCache && pwaFilesToCache.length > 0)
   cache.addAll(pwaFilesToCache);
 }));
});

self.addEventListener("fetch", function(event) {
 if (event.request.url.startsWith(self.location.origin) &&
  ["document", "font", "image", "manifest", "script", "style"].indexOf(event.request.destination) >= 0) {
  event.respondWith(caches.match(event.request).then(function(response) {
   if (!event.request.headers.get("range"))
    return (event.request.cache == "default" && !navigator.onLine ||
     ["force-cache", "only-if-cached"].indexOf(event.request.cache) >= 0) ? response :
    fetch(event.request, { credentials: "same-origin" }).then(function(response) {
     if (event.request.cache != "no-store" && event.request.method == "GET" && response && response.ok &&
      (event.request.destination != "document" || /text\/html/.test(response.headers.get("content-type")))) {
      var buffer = response.clone();
      caches.open(pwaCacheName).then(function(cache) {
       cache.put(event.request, buffer);
      });
     }
     return response;
    });
   }));
 }
});

self.addEventListener("activate", function(event) {
 event.waitUntil(
  caches.keys().then(function(keyList) {
   return Promise.all(keyList.map(function(key) {
    if (key !== pwaCacheName) {
     return caches.delete(key);
    }
   }));
  })
 );
 return self.clients.claim();
});

/*
self.addEventListener("activate", function(event) {
 return self.clients.claim();
});
*/

self.addEventListener("push", function(event) {
 if (self.Notification && self.Notification.permission == "granted" && event.data) {
  var title = self.location.hostname, options = {};
  try {
   var data = event.data.json();
   if ("title" in data)
    title = data.title;
   if ("options" in data)
    options = data.options;
  } catch (e) {
   options.body = event.data.text();
  }
  self.registration.showNotification(title, options);
 }
});

self.addEventListener("notificationclick", function(event) {
 event.notification.close();
 event.waitUntil(clients.matchAll({
  type: "window"
 }).then(function(clientList) {
  for (var i = 0; i < clientList.length; i++) {
   var client = clientList[i];
   if ("focus" in client)
    return client.focus();
  }
  return clients.openWindow(event.notification.data && event.notification.data.url || "/");
 }));
});