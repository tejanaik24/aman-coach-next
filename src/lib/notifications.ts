export function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return Promise.resolve("denied" as NotificationPermission)
  }
  return Notification.requestPermission()
}

export function sendBrowserNotification(title: string, body: string): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return
  }
  new Notification(title, {
    body,
    icon: "/icon-192.png",
  })
}

export function isNotificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator
}
