"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { motion } from "motion/react"
import { ClipboardCheck } from "lucide-react"
import { format } from "date-fns"

export default function CoachCheckinsPage() {
  const { checkins, clients, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const clientMap = new Map(clients.map((c) => [c.uid, c]))

  return (
    <CoachLayout>
      <div className="flex items-center gap-2 mb-6">
        <ClipboardCheck className="size-5 text-purple" />
        <h1 className="font-heading text-2xl text-white">Check-ins</h1>
      </div>

      {checkins.length > 0 ? (
        <div className="space-y-2">
          {checkins.slice(0, 30).map((c, i) => {
            const client = clientMap.get(c.clientId)
            const energyEmoji = c.energy && c.energy <= 2 ? "😫" : c.energy && c.energy <= 4 ? "😐" : c.energy && c.energy <= 6 ? "🙂" : "💪"

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-purple/20 flex items-center justify-center">
                      <span className="text-xs font-heading text-purple-light">
                        {client?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">
                      {client?.displayName || c.clientId.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{energyEmoji}</span>
                    <span className="text-xs text-zinc-500">
                      {format(new Date(c.date), "MMM d")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-400 ml-10">
                  {c.weight && <span>W: {c.weight}kg</span>}
                  {c.energy && <span>E: {c.energy}/5</span>}
                  {c.sleep && <span>S: {c.sleep}/5</span>}
                </div>
                {c.notes && (
                  <p className="text-xs text-zinc-500 mt-2 ml-10 line-clamp-2">{c.notes}</p>
                )}
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <ClipboardCheck className="size-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No check-ins yet</p>
        </div>
      )}
    </CoachLayout>
  )
}
