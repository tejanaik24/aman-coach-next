"use client"

import { useState } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { updateCheckin } from "@/lib/store"
import { Checkin } from "@/types"
import { motion } from "motion/react"
import { ClipboardCheck, X, StickyNote } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"

export default function CoachCheckinsPage() {
  const { checkins, clients, loading, refresh } = useCoachData()
  const [reviewing, setReviewing] = useState<Checkin | null>(null)
  const [coachNotes, setCoachNotes] = useState("")
  const [saving, setSaving] = useState(false)

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const clientMap = new Map(clients.map((c) => [c.uid, c]))

  const openReview = (c: Checkin) => {
    setReviewing(c)
    setCoachNotes(c.coachNotes || "")
  }

  const saveReview = async () => {
    if (!reviewing) return
    setSaving(true)
    try {
      await updateCheckin(reviewing.id, { coachNotes })
      toast.success("Check-in reviewed")
      setReviewing(null)
      refresh()
    } catch {
      toast.error("Failed to save review")
    } finally {
      setSaving(false)
    }
  }

  const energyEmoji = (e?: number) => {
    if (!e) return "💪"
    if (e <= 2) return "😫"
    if (e <= 4) return "😐"
    if (e <= 6) return "🙂"
    return "💪"
  }

  return (
    <CoachLayout>
      <div className="flex items-center gap-2 mb-6">
        <ClipboardCheck className="size-5 text-[#FFB800]" />
        <h1 className="font-heading text-2xl text-white">Check-ins</h1>
      </div>

      {checkins.length > 0 ? (
        <div className="space-y-2">
          {checkins.slice(0, 30).map((c, i) => {
            const client = clientMap.get(c.clientId)
            const initials = client?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"

            return (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openReview(c)}
                className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
                      <span className="text-xs font-heading text-[#FFD200]">{initials}</span>
                    </div>
                    <p className="text-sm text-white font-medium">
                      {client?.displayName || c.clientId.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{energyEmoji(c.energy)}</span>
                    <span className="text-xs text-zinc-500">
                      {format(new Date(c.date), "MMM d")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-400 ml-10">
                  {c.weight && <span>W: {c.weight}kg</span>}
                  {c.energy && <span>E: {c.energy}/5</span>}
                  {c.sleep && <span>S: {c.sleep}/5</span>}
                  {c.coachNotes && (
                    <span className="text-[#FFD200] flex items-center gap-1">
                      <StickyNote className="size-3" /> Reviewed
                    </span>
                  )}
                </div>
                {c.notes && (
                  <p className="text-xs text-zinc-500 mt-2 ml-10 line-clamp-2">{c.notes}</p>
                )}
              </motion.button>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <ClipboardCheck className="size-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No check-ins yet</p>
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sm:max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg text-white">Review Check-in</h2>
              <button onClick={() => setReviewing(null)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Client:</span>
                <span className="text-white font-medium">{clientMap.get(reviewing.clientId)?.displayName || reviewing.clientId.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Date:</span>
                <span className="text-white">{format(new Date(reviewing.date), "MMM d, yyyy")}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {reviewing.weight && (
                  <div className="rounded-xl bg-zinc-800/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Weight</p>
                    <p className="text-white font-medium">{reviewing.weight} kg</p>
                  </div>
                )}
                {reviewing.energy !== undefined && (
                  <div className="rounded-xl bg-zinc-800/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Energy</p>
                    <p className="text-white font-medium">{reviewing.energy}/5 {energyEmoji(reviewing.energy)}</p>
                  </div>
                )}
                {reviewing.sleep !== undefined && (
                  <div className="rounded-xl bg-zinc-800/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Sleep</p>
                    <p className="text-white font-medium">{reviewing.sleep}/5</p>
                  </div>
                )}
                {reviewing.mood !== undefined && (
                  <div className="rounded-xl bg-zinc-800/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Mood</p>
                    <p className="text-white font-medium">{reviewing.mood}/5</p>
                  </div>
                )}
                {reviewing.hunger !== undefined && (
                  <div className="rounded-xl bg-zinc-800/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Hunger</p>
                    <p className="text-white font-medium">{reviewing.hunger}/5</p>
                  </div>
                )}
                {reviewing.adherence !== undefined && (
                  <div className="rounded-xl bg-zinc-800/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Adherence</p>
                    <p className="text-white font-medium">{reviewing.adherence}/5</p>
                  </div>
                )}
              </div>
              {reviewing.notes && (
                <div className="rounded-xl bg-zinc-800/50 p-3">
                  <p className="text-[10px] text-zinc-500 uppercase mb-1">Client Notes</p>
                  <p className="text-sm text-zinc-300">{reviewing.notes}</p>
                </div>
              )}
              {reviewing.measurements && (
                <div className="rounded-xl bg-zinc-800/50 p-3">
                  <p className="text-[10px] text-zinc-500 uppercase mb-2">Measurements</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    {reviewing.measurements.chest && <span>Chest: {reviewing.measurements.chest} cm</span>}
                    {reviewing.measurements.waist && <span>Waist: {reviewing.measurements.waist} cm</span>}
                    {reviewing.measurements.hips && <span>Hips: {reviewing.measurements.hips} cm</span>}
                    {reviewing.measurements.arms && <span>Arms: {reviewing.measurements.arms} cm</span>}
                    {reviewing.measurements.thighs && <span>Thighs: {reviewing.measurements.thighs} cm</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-zinc-800/50 p-3 mb-4">
              <p className="text-[10px] text-zinc-500 uppercase mb-1 flex items-center gap-1">
                <StickyNote className="size-3" /> Coach Notes
              </p>
              <textarea
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none resize-none min-h-[80px]"
                placeholder="Add your observations, feedback, or plan adjustments..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReviewing(null)}
                className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveReview}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#FFB800] py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save Review"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </CoachLayout>
  )
}
