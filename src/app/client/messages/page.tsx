"use client"

import { useState, useEffect, useRef } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { sendMessage, getMessages } from "@/lib/store"
import { Message } from "@/types"
import toast from "react-hot-toast"
import { MessageSquare, Send } from "lucide-react"

export default function MessagesPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uid = user?.uid
    if (!uid) return
    async function load() {
      try {
        const msgs = await getMessages(uid!, "coach")
        setMessages(msgs)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !user?.uid) return
    try {
      await sendMessage({
        senderId: user.uid,
        receiverId: "coach",
        text: text.trim(),
        read: false,
      })
      setText("")
      const msgs = await getMessages(user.uid, "coach")
      setMessages(msgs)
    } catch {
      toast.error("Failed to send message")
    }
  }

  return (
    <ClientLayout>
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="size-5 text-purple" />
        <h1 className="font-heading text-2xl text-white">Messages</h1>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 mb-4">
        {loading ? (
          <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
        ) : messages.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {[...messages].reverse().map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderId === user?.uid ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.senderId === user?.uid
                      ? "bg-purple text-white rounded-br-md"
                      : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                  }`}
                >
                  {m.text}
                  <p className={`text-[10px] mt-1 ${
                    m.senderId === user?.uid ? "text-purple-light/60" : "text-zinc-500"
                  }`}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : ""}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="size-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No messages yet. Start a conversation!</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-xl bg-purple px-4 py-3 text-white hover:bg-purple-dark disabled:opacity-50 transition-colors"
        >
          <Send className="size-5" />
        </button>
      </div>
    </ClientLayout>
  )
}
