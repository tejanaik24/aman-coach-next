"use client"

import { useState, useEffect, useRef } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { getCoachClients, getUserMessages, sendMessage, markMessageRead } from "@/lib/store"
import { Message, Client } from "@/types"
import { motion } from "motion/react"
import { MessageSquare, Send, ChevronLeft } from "lucide-react"
import { format } from "date-fns"

interface Conversation {
  clientId: string
  client: Client | undefined
  lastMessage: Message
  unread: number
  messages: Message[]
}

export default function CoachMessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.id) return
    const uid: string = user.id
    async function load() {
      try {
        const [msgList, cl] = await Promise.all([
          getUserMessages(uid, 200),
          getCoachClients(uid),
        ])
        setClients(cl)
        const clientMap = new Map(cl.map((c) => [c.uid, c]))

        const grouped = new Map<string, Message[]>()
        for (const m of msgList) {
          const otherId = m.senderId === uid ? m.receiverId : m.senderId
          const arr = grouped.get(otherId) || []
          arr.push(m)
          grouped.set(otherId, arr)
        }

        const convs: Conversation[] = []
        for (const [clientId, msgs] of grouped) {
          const sorted = msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          convs.push({
            clientId,
            client: clientMap.get(clientId),
            lastMessage: sorted[0],
            unread: msgs.filter((m) => m.receiverId === uid && !m.read).length,
            messages: sorted.reverse(),
          })
        }
        convs.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())
        setConversations(convs)
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
  }, [chatMessages])

  const openChat = async (client: Client) => {
    setSelectedClient(client)
    if (!user?.id) return
    const all = await getUserMessages(user.id, 200)
    const msgs = all
      .filter((m) => (m.senderId === user.id && m.receiverId === client.uid) || (m.senderId === client.uid && m.receiverId === user.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    setChatMessages(msgs)

    const unread = msgs.filter((m) => m.senderId === client.uid && !m.read)
    for (const m of unread) {
      markMessageRead(m.id).catch(() => {})
    }
  }

  const handleSend = async () => {
    if (!text.trim() || !user?.id || !selectedClient) return
    setSending(true)
    try {
      await sendMessage({
        senderId: user.id,
        receiverId: selectedClient.uid,
        text: text.trim(),
      })
      setText("")
      const all = await getUserMessages(user.id, 200)
      const msgs = all
        .filter((m) => (m.senderId === user.id && m.receiverId === selectedClient.uid) || (m.senderId === selectedClient.uid && m.receiverId === user.id))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      setChatMessages(msgs)
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="size-5 text-[#FFB800]" />
        <h1 className="font-heading text-2xl text-white">Messages</h1>
      </div>

      {selectedClient ? (
        <div>
          <button
            onClick={() => { setSelectedClient(null); setChatMessages([]) }}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-4 lg:hidden"
          >
            <ChevronLeft className="size-4" />
            Back to conversations
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="size-8 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
              <span className="text-xs font-heading text-[#FFD200]">
                {selectedClient.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
              </span>
            </div>
            <div>
              <p className="text-sm text-white font-medium">{selectedClient.displayName}</p>
              <p className="text-[10px] text-zinc-500">{selectedClient.phone || selectedClient.email}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 mb-4">
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {chatMessages.length > 0 ? (
                chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.senderId === user?.id
                        ? "bg-[#FFB800] text-white rounded-br-md"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-md"
                    }`}>
                      {m.text}
                      <p className={`text-[10px] mt-1 ${
                        m.senderId === user?.id ? "text-[#FFD200]/60" : "text-zinc-500"
                      }`}>
                        {m.createdAt ? format(new Date(m.createdAt), "MMM d, h:mm a") : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500 text-center py-4">No messages yet</p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !sending && handleSend()}
              className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
              placeholder="Type a message..."
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="rounded-xl bg-[#FFB800] px-4 py-3 text-white hover:bg-[#B28000] disabled:opacity-50 transition-colors"
            >
              <Send className="size-5" />
            </button>
          </div>
        </div>
      ) : conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv, i) => {
            const initials = conv.client?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"
            return (
              <motion.button
                key={conv.clientId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => conv.client && openChat(conv.client)}
                className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-10 rounded-full bg-[#FFB800]/20 flex items-center justify-center shrink-0">
                    <span className="font-heading text-sm text-[#FFD200]">{initials}</span>
                    {conv.unread > 0 && (
                      <span className="absolute -top-1 -right-1 size-5 rounded-full bg-[#FFB800] text-[9px] font-bold text-white flex items-center justify-center">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-medium truncate">
                        {conv.client?.displayName || "Unknown Client"}
                      </p>
                      <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                        {format(new Date(conv.lastMessage.createdAt), "MMM d")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {conv.lastMessage.senderId === user?.id ? "You: " : ""}
                      {conv.lastMessage.text}
                    </p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <MessageSquare className="size-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No conversations yet</p>
          <p className="text-xs text-zinc-600 mt-1">Messages from clients will appear here</p>
        </div>
      )}
    </CoachLayout>
  )
}
