// Two Of Us — bildirim servis çalışanı (service worker)

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Bildirim butonlarını destekleyen tarayıcılar (Android Chrome vb.). iPhone Safari desteklemiyor;
// orada bildirime dokununca uygulama ilgili ekranda açılır.
const SUPPORTS_ACTIONS = typeof Notification !== "undefined" && "actions" in Notification.prototype;

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Two Of Us", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Two Of Us";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url: data.url || "/", token: data.token || null },
  };
  if (SUPPORTS_ACTIONS && Array.isArray(data.actions) && data.token) {
    options.actions = data.actions.slice(0, 2);
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

function openApp(path) {
  const url = new URL(path || "/", self.location.origin).href;
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  });
}

async function runAction(action, data, tag) {
  try {
    const res = await fetch("/api/bildirim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.token, action }),
    });
    const r = await res.json().catch(() => ({}));
    if (r.ok) {
      // Açık bir uygulama penceresi varsa yenilensin
      const list = await self.clients.matchAll({ type: "window" });
      list.forEach((c) => c.postMessage({ type: "refresh" }));
      return self.registration.showNotification(r.title || "Tamam ✓", {
        body: r.body || "",
        icon: "/icon-192.png",
        badge: "/badge-96.png",
        tag: tag ? `${tag}-sonuc` : undefined,
      });
    }
    await self.registration.showNotification("İşlem yapılamadı", {
      body: r.message || "Uygulamadan devam et.",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
    });
    return openApp(data.url);
  } catch {
    return openApp(data.url);
  }
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const data = n.data || {};
  n.close();
  if (event.action && data.token) {
    event.waitUntil(runAction(event.action, data, n.tag));
  } else {
    event.waitUntil(openApp(data.url));
  }
});
