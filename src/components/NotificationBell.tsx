"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, CheckCheck, Calendar, AlertTriangle, Dumbbell, UtensilsCrossed, CreditCard } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { getNotifications, markNotificationRead } from "@/lib/store"
import type { Notification } from "@/types"
import { formatDistanceToNow } from "date-fns"

const typeIcons: Record<string, React.ReactNode> = {
  checkin: <Calendar className="size-3.5 text-[#FFD200]" />,
  payment: <CreditCard className="size-3.5 text-green-400" />,
  plan: <AlertTriangle className="size-3.5 text-yellow-400" />,
  workout: <Dumbbell className="size-3.5 text-blue-400" />,
  diet: <UtensilsCrossed className="size-3.5 text-orange-400" />,
  reminder: <AlertTriangle className="size-3.5 text-[#FFD200]" />,
}

export function NotificationBell({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  const loadNotifications = useCallback(async () => {
    if (!userId) return
    try {
      const all = await getNotifications(userId)
      setNotifications(all)
      setUnreadCount(all.filter((n) => !n.read).length)
    } catch {
      // ignore
    }
  }, [userId])

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true
      loadNotifications()
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!userId) return
    const supabase = getSupabaseClient()
    if (!supabase) return

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
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, loadNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleMarkAllRead = async () => {
    if (!userId) return
    try {
      await Promise.all(
        notifications.filter((n) => !n.read).map((n) => markNotificationRead(n.id))
      )
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-zinc-400 hover:text-white transition-colors"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#FFB800] text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] text-[#FFD200] hover:text-[#FFB800] transition-colors"
              >
                <CheckCheck className="size-3" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/30 ${
                    !n.read ? "bg-[#FFB800]/5" : ""
                  }`}
                >
                  <div className="mt-0.5">{typeIcons[n.type] || <Bell className="size-3.5 text-zinc-500" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{n.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 size-2 rounded-full bg-[#FFB800] shrink-0" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <Bell className="size-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
