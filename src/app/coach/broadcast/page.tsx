"use client"

import { useState } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { sendMessage } from "@/lib/firestore"
import { useAuth } from "@/hooks/useAuth"
import toast from "react-hot-toast"

export default function CoachBroadcastPage() {
  const { user } = useAuth()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  const handleBroadcast = async () => {
    if (!text.trim() || !user?.uid) return
    setSending(true)
    try {
      await sendMessage({
        senderId: user.uid,
        receiverId: "all-clients",
        text: text.trim(),
        read: false,
      })
      toast.success("Broadcast sent to all clients!")
      setText("")
    } catch {
      toast.error("Failed to send broadcast")
    } finally {
      setSending(false)
    }
  }

  return (
    <CoachLayout>
      <h1 className="font-heading text-3xl text-white mb-2">BROADCAST</h1>
      <p className="text-sm text-white/40 mb-6">
        Send a message to all your clients at once.
      </p>

      <Card>
        <CardTitle className="text-base">New Broadcast</CardTitle>
        <CardContent className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold/30 min-h-[120px] resize-none"
            placeholder="Type your broadcast message..."
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/30">{text.length} characters</span>
            <button
              onClick={handleBroadcast}
              disabled={!text.trim() || sending}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Broadcast"}
            </button>
          </div>
        </CardContent>
      </Card>
    </CoachLayout>
  )
}
