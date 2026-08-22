(self as any).addEventListener("push", (event: any) => {
  const data = event.data ? event.data.json() : { title: "Vibe Todos", body: "Time to check your tasks!" };
  
  event.waitUntil(
    (self as any).registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      badge: "/badge.png",
      vibrate: [100, 50, 100],
      data: { url: "/" }
    })
  );
});

(self as any).addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil(
    (self as any).clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: any) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return (self as any).clients.openWindow("/");
    })
  );
});
