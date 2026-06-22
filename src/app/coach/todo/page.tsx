"use client"

import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useCoachData } from "@/hooks/useCoach"
import { motion } from "motion/react"
import { CheckSquare, ClipboardCheck, Users, MessageSquare, StickyNote, Calendar } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function CoachTodoPage() {
  const { checkins, clients, loading } = useCoachData()

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  const clientMap = new Map(clients.map((c) => [c.uid, c]))
  const today = new Date()

  const pendingReviews = checkins
    .filter((c) => !c.coachNotes)
    .slice(0, 10)

  const todayCheckins = checkins.filter(
    (c) => format(new Date(c.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
  )

  const unreadMessages = clients.filter((c) => {
    const lastCheckin = checkins.find((ch) => ch.clientId === c.uid)
    return lastCheckin && !lastCheckin.coachNotes
  })

  return (
    <CoachLayout>
      <div className="flex items-center gap-2 mb-6">
        <CheckSquare className="size-5 text-[#FFB800]" />
        <h1 className="font-heading text-2xl text-white">To-Do</h1>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 snap-x snap-mandatory scrollbar-none">
        <div className="min-w-[120px] rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <ClipboardCheck className="size-5 text-[#FFD200] mb-2" />
          <p className="font-heading text-2xl text-white">{pendingReviews.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pending Reviews</p>
        </div>
        <div className="min-w-[120px] rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <Calendar className="size-5 text-[#FFD200] mb-2" />
          <p className="font-heading text-2xl text-white">{todayCheckins.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Today Check-ins</p>
        </div>
        <div className="min-w-[120px] rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <Users className="size-5 text-[#FFD200] mb-2" />
          <p className="font-heading text-2xl text-white">{clients.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Clients</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
            <StickyNote className="size-3.5" /> Pending Check-in Reviews
          </p>
          {pendingReviews.length > 0 && (
            <Link href="/coach/checkins" className="text-[10px] text-[#FFD200] hover:text-[#FFB800] transition-colors">
              View all
            </Link>
          )}
        </div>
        {pendingReviews.length > 0 ? (
          <div className="space-y-2">
            {pendingReviews.map((c, i) => {
              const client = clientMap.get(c.clientId)
              const initials = client?.displayName?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
                        <span className="text-xs font-heading text-[#FFD200]">{initials}</span>
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{client?.displayName || "Unknown"}</p>
                        <p className="text-[10px] text-zinc-500">{format(new Date(c.date), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                    <Link
                      href="/coach/checkins"
                      className="rounded-full bg-[#FFB800] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                  {c.notes && (
                    <p className="text-xs text-zinc-500 mt-2 ml-10 line-clamp-1">{c.notes}</p>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <ClipboardCheck className="size-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">All check-ins reviewed!</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
            <MessageSquare className="size-3.5" /> Recent Activity
          </p>
        </div>
        <div className="space-y-2">
          {checkins.slice(0, 5).map((c, i) => {
            const client = clientMap.get(c.clientId)
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <ClipboardCheck className="size-3.5 text-[#FFD200]" />
                    <span className="text-zinc-300">{client?.displayName || "Unknown"}</span>
                    <span className="text-zinc-500">checked in</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{format(new Date(c.date), "MMM d")}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </CoachLayout>
  )
}
