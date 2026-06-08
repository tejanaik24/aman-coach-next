"use client"

import { useState, useEffect, useRef } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { sendMessage, getMessages } from "@/lib/firestore"
import { Message } from "@/types"
import toast from "react-hot-toast"

export default function MessagesPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.uid) return
    const uid = user.uid
    async function load() {
      try {
        const msgs = await getMessages(uid, "coach")
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
      <h1 className="font-heading text-3xl text-white mb-6">MESSAGES</h1>

      <Card className="mb-4">
        <CardContent>
          {loading ? (
            <p className="text-sm text-white/40 text-center py-8">Loading...</p>
          ) : messages.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.reverse().map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderId === user?.uid ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.senderId === user?.uid
                        ? "bg-gold text-black"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {m.text}
                    <p className="text-[10px] mt-1 opacity-50">
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-8">
              No messages yet. Start a conversation with your coach.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold/30"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </ClientLayout>
  )
}
