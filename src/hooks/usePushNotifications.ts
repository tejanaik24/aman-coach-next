"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission)
  }, [])

  const subscribe = useCallback(async () => {
    if (permission === "unsupported") return { subscribed: false }

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") return { subscribed: false }
    }

    if (Notification.permission !== "granted") return { subscribed: false }

    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ subscription: existing.toJSON() }),
          })
        }
        setSubscribed(true)
        return { subscribed: true }
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) return { subscribed: false }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      })

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
      }
      setSubscribed(true)
      return { subscribed: true }
    } catch (err) {
      console.error("Push subscribe error:", err)
      return { subscribed: false }
    }
  }, [permission])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        const endpoint = existing.endpoint
        await existing.unsubscribe()
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ endpoint }),
          })
        }
      }
      setSubscribed(false)
    } catch (err) {
      console.error("Push unsubscribe error:", err)
    }
  }, [])

  return { subscribed, permission, subscribe, unsubscribe }
}
