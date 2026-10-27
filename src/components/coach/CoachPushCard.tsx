"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import toast from "react-hot-toast"
import { usePushNotifications } from "@/hooks/usePushNotifications"

/** Quick Manage card: turns on phone alerts for new check-ins, questionnaires and bookings. Hidden once on. */
export default function CoachPushCard() {
  const { permission, subscribed, subscribe } = usePushNotifications()
  const [busy, setBusy] = useState(false)

  // Already allowed on this phone: re-register silently so the server always has this phone
  useEffect(() => {
    if (permission === "granted") subscribe()
  }, [permission, subscribe])

  if (subscribed || permission === "unsupported") return null

  const blocked = permission === "denied"
  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle p-4 flex items-center gap-3">
      <Bell className="w-6 h-6 text-accent-orange shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold">Alerts on this phone</p>
        <p className="text-text-muted text-sm mt-0.5">
          {blocked ? "Blocked. Allow notifications for this site in phone settings." : "Get a ping for every check-in, questionnaire and booking."}
        </p>
      </div>
      {!blocked && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const r = await subscribe()
            setBusy(false)
            toast[r.subscribed ? "success" : "error"](r.subscribed ? "Alerts on ✅" : "Could not turn on. Allow notifications and try again.")
          }}
          className="bg-accent-orange text-white text-sm font-bold px-4 py-2.5 rounded-full shrink-0 cursor-pointer disabled:opacity-50"
        >
          {busy ? "…" : "Turn on"}
        </button>
      )}
    </div>
  )
}
