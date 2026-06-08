"use client"

import { use, useState } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"
import { motion } from "motion/react"
import { Phone, MessageSquare, Upload, ArrowLeft, Send, Camera, CreditCard, StickyNote } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

type Tab = "overview" | "checkins" | "payments" | "notes"

export default function CoachClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { client, checkins, payments, loading } = useClientData(id)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [notes, setNotes] = useState("")
  const [notesSaved, setNotesSaved] = useState(false)

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>
  if (!client) {
    return (
      <CoachLayout>
        <EmptyState icon="🔍" title="Client not found" />
      </CoachLayout>
    )
  }

  const initials = client.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: null },
    { key: "checkins", label: "Check-ins", icon: null },
    { key: "payments", label: "Payments", icon: null },
    { key: "notes", label: "Notes", icon: null },
  ]

  const handleSaveNotes = () => {
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  return (
    <CoachLayout>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="size-14 rounded-full bg-purple/20 flex items-center justify-center">
          <span className="font-heading text-xl text-purple-light">{initials}</span>
        </div>
        <div>
          <h1 className="font-heading text-2xl text-white">{client.displayName}</h1>
          <p className="text-sm text-zinc-500">{client.phone || client.email}</p>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
            client.status === "active" ? "bg-green-500/20 text-green-400" :
            client.status === "paused" ? "bg-yellow-500/20 text-yellow-400" :
            "bg-red-500/20 text-red-400"
          }`}>
            {client.status}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-purple text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Goal</p>
              <p className="font-heading text-lg text-white mt-1 capitalize">{client.goal?.replace("-", " ") || "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Plan</p>
              <p className="font-heading text-lg text-white mt-1 capitalize">{client.plan || "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Weight</p>
              <p className="font-heading text-lg text-white mt-1">{client.weight ? `${client.weight} kg` : "—"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Last Check-in</p>
              <p className="font-heading text-lg text-white mt-1">
                {checkins[0] ? format(new Date(checkins[0].date), "MMM d") : "None"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 rounded-full bg-green-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
              <Send className="size-3.5" />
              WhatsApp
            </button>
            <button className="flex-1 rounded-full bg-purple py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-colors flex items-center justify-center gap-1.5">
              <Upload className="size-3.5" />
              Upload Plan
            </button>
            <button className="flex-1 rounded-full bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5">
              <MessageSquare className="size-3.5" />
              Message
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === "checkins" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {checkins.length > 0 ? (
            <div className="space-y-2">
              {checkins.map((c) => (
                <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">
                      {format(new Date(c.date), "MMM d, yyyy")}
                    </span>
                    <span className="text-lg">
                      {c.energy && c.energy <= 2 ? "😫" : c.energy && c.energy <= 4 ? "😐" : c.energy && c.energy <= 6 ? "🙂" : "💪"}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-400">
                    {c.weight && <span>Weight: {c.weight}kg</span>}
                    {c.energy && <span>Energy: {c.energy}/5</span>}
                    {c.sleep && <span>Sleep: {c.sleep}/5</span>}
                  </div>
                  {c.notes && <p className="text-xs text-zinc-500 mt-2">{c.notes}</p>}
                  {c.photos && c.photos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {c.photos.map((photo, i) => (
                        <Camera key={i} className="size-8 text-zinc-500" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <Camera className="size-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No check-ins yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "payments" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div>
                    <p className="text-sm text-white font-medium">{p.plan || "Payment"}</p>
                    <p className="text-xs text-zinc-500">{format(new Date(p.date), "MMM d, yyyy")}</p>
                    <p className="font-heading text-lg text-white mt-0.5">₹{p.amount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                      p.status === "completed" ? "bg-green-500/20 text-green-400" :
                      p.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {p.status}
                    </span>
                    {p.status !== "completed" && (
                      <button className="rounded-full bg-purple px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-colors">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <CreditCard className="size-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No payments yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "notes" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Private Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple focus:ring-1 focus:ring-purple/30 min-h-[150px] resize-none"
              placeholder="Add private notes about this client..."
            />
            <button
              onClick={handleSaveNotes}
              className="mt-3 rounded-full bg-purple px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-colors"
            >
              {notesSaved ? "Saved ✓" : "Save Notes"}
            </button>
          </div>
        </motion.div>
      )}
    </CoachLayout>
  )
}
