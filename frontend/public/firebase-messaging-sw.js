importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCKjo-Fg_beokDYsLEHnXjF-WCOAvCg0pE",
  authDomain: "showly-firebase.firebaseapp.com",
  projectId: "showly-firebase",
  storageBucket: "showly-firebase.appspot.com",
  messagingSenderId: "88982263213",
  appId: "1:88982263213:web:09b6bf6788c94eb35dfd24",
  measurementId: "G-Q1SCLJ7LYD",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const title = payload?.data?.title || "Nowe powiadomienie";
  const body = payload?.data?.body || "Masz nowe zdarzenie w aplikacji";
  const url = payload?.data?.url || "/";
  const icon = payload?.data?.icon || "/logo192.png";

  self.registration.showNotification(title, {
    body,
    icon,
    data: { url },
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const rawUrl = event.notification?.data?.url || "/";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});