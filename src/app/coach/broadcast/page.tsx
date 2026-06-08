"use client"

import { useState } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { sendMessage } from "@/lib/store"
import { useAuth } from "@/hooks/useAuth"
import toast from "react-hot-toast"
import { Send } from "lucide-react"

export default function CoachBroadcastPage() {
  const { user } = useAuth()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  const handleBroadcast = async () => {
    if (!text.trim() || !user?.id) return
    setSending(true)
    try {
      await sendMessage({
        senderId: user.id,
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
      <div className="flex items-center gap-2 mb-2">
        <Send className="size-5 text-purple" />
        <h1 className="font-heading text-2xl text-white">Broadcast</h1>
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        Send a message to all your clients at once.
      </p>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-sm font-medium text-white mb-3">New Broadcast</p>
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple focus:ring-1 focus:ring-purple/30 min-h-[120px] resize-none"
            placeholder="Type your broadcast message..."
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{text.length} characters</span>
            <button
              onClick={handleBroadcast}
              disabled={!text.trim() || sending}
              className="rounded-full bg-purple px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-purple-dark disabled:opacity-50 transition-colors"
            >
              {sending ? "Sending..." : "Send Broadcast"}
            </button>
          </div>
        </div>
      </div>
    </CoachLayout>
  )
}
