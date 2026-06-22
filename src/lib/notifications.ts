import { getSupabaseClient } from "./supabase"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

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

export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: unknown) => void
) {
  const supabase = getSupabaseClient()
  if (!supabase) return () => {}

  const channel = supabase
    .channel("notifications-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        onNotification(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
