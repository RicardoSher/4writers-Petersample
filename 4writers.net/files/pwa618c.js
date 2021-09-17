function registerServiceWorker(script)
{
 if (!("serviceWorker" in navigator)) return null;
 var base = document.baseURI || location.href;
 var scriptURL = new URL(script, base);
 navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for (var registration of registrations)
   if (registration.active && registration.active.scriptURL != scriptURL.href)
   {
    var regURL = new URL(registration.active.scriptURL, base);
    if (regURL.host == scriptURL.host && regURL.pathname == scriptURL.pathname)
     registration.unregister();
   }
 });
 return navigator.serviceWorker.register(script);
}

function webPushManager(subscriptionEndopint, publicKey)
{
 var serviceWorkerRegistration = null;
 var pushManager = null;
 var pushManagerPermission = null;
 var pushManagerSubscription = null;
 var eventListeners = {
  "ready": [],
  "subscribe": [],
  "unsubscribe": []
 };

 function log()
 {
  if ("console" in window)
   console.log.apply(console, arguments);
 }
 
 function base64urlToUint8Array(base64String)
 {
  var padding = "=".repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0, l = rawData.length; i < l; i++)
   outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
 }

 function trigger(event)
 {
  var args = Array.apply(null, arguments).slice(1);
  for (var i in eventListeners[event])
   try {
    eventListeners[event][i].apply(window, args);
   } catch (e) {}
 }

 this.on = function(event, callback)
 {
  if (event in eventListeners && typeof callback == "function")
  {
   var i = eventListeners[event].indexOf(callback);
   if (i == -1) eventListeners[event].push(callback);
  }
 }

 this.off = function(event, callback)
 {
  if (event in eventListeners)
  {
   var i = eventListeners[event].indexOf(callback);
   if (i >= 0) eventListeners[event].splice(i, 1);
  }
 }

 this.subscribe = function()
 {
  if (!serviceWorkerRegistration)
  {
   log("Service worker is not registered");
   return false;
  }
  if (!pushManager)
  {
   log("Push notifications are not supported");
   return false;
  }
  if (pushManagerSubscription) {
   log("User is already subscribed");
   return false;
  }
  pushManager.subscribe({
   userVisibleOnly: true,
   applicationServerKey: base64urlToUint8Array(publicKey)
  }).then(function(subscription) {
   pushManagerPermission = "granted";
   pushManagerSubscription = subscription;
   fetch(subscriptionEndopint, {
    method: "POST",
    credentials: "include",
    headers: {
     "Content-Type": "application/json"
    },
    body: JSON.stringify(subscription)
   }).then(function(response) {
    log("User is successfully subscribed");
    trigger("subscribe", subscription);
   }).catch(function(error) {
    pushManagerSubscription = null;
    log("Failed to send the subscription data:", error);
   });  
  }).catch(function(error) {
   log("Failed to subscribe the user:", error);
  });
  return true;
 }

 this.unsubscribe = function()
 {
  if (!pushManagerSubscription) {
   log("User is not subscribed");
   return false;
  }
  pushManagerSubscription.unsubscribe().then(function() {
   fetch(subscriptionEndopint, {
    method: "DELETE",
    credentials: "include",
    headers: {
     "Content-Type": "application/json"
    },
    body: JSON.stringify(pushManagerSubscription)
   }).then(function(response) {
    log("User is successfully unsubscribed");
   }).catch(function(error) {
    log("Failed to send the unsubscription data:", error);
   });
   pushManagerSubscription = null;
   trigger("unsubscribe", null);
  }).catch(function(error) {
   log("Failed to unsubscribe the user:", error);
  });
  return true;
 }

 this.available = function()
 {
  return !!pushManager;
 }

 this.permission = function()
 {
  return pushManagerPermission;
 }

 this.subscription = function()
 {
  return pushManagerSubscription;
 }

 this.notify = function(title, options)
 {
  if (!serviceWorkerRegistration)
  {
   log("Service worker is not registered");
   return false;
  }
  return serviceWorkerRegistration.showNotification(title, options);
 }

 if ("serviceWorker" in navigator)
  navigator.serviceWorker.ready.then(function(registration) {
   serviceWorkerRegistration = registration;
   if ("pushManager" in registration)
    (pushManager = registration.pushManager).permissionState({
     userVisibleOnly: true,
     applicationServerKey: base64urlToUint8Array(publicKey)
    }).then(function(state) {
     pushManagerPermission = state;
     registration.pushManager.getSubscription().then(function(subscription) {
      pushManagerSubscription = subscription;
      trigger("ready", subscription);
     });
    });
  });
}