"use client"

import { useState, useEffect, useCallback } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAuth } from "@/hooks/useAuth"
import { useCoachData } from "@/hooks/useCoach"
import { getAppointments, updateAppointmentStatus } from "@/lib/store"
import { Appointment } from "@/types"
import { motion, AnimatePresence } from "motion/react"
import { CalendarDays, Clock, Check, X, User, Phone, Loader2, Filter } from "lucide-react"
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns"
import toast from "react-hot-toast"

type FilterType = "all" | "upcoming" | "past"

export default function CoachAppointmentsPage() {
  const { user } = useAuth()
  const { clients } = useCoachData()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("upcoming")
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadAppointments = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await getAppointments(user.id, "coach")
      setAppointments(data)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  const handleComplete = async (id: string) => {
    setProcessingId(id)
    try {
      await updateAppointmentStatus(id, "completed")
      toast.success("Marked as completed")
      await loadAppointments()
    } catch {
      toast.error("Failed to update")
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancel = async (id: string) => {
    setProcessingId(id)
    try {
      await updateAppointmentStatus(id, "cancelled")
      toast.success("Appointment cancelled")
      await loadAppointments()
    } catch {
      toast.error("Failed to cancel")
    } finally {
      setProcessingId(null)
    }
  }

  const now = new Date()

  const filtered = appointments.filter((a) => {
    if (filter === "all") return true
    const aptDate = new Date(`${a.date}T${a.startTime}`)
    if (filter === "upcoming") return a.status === "scheduled" && isAfter(aptDate, now)
    if (filter === "past") return a.status !== "scheduled" || isBefore(aptDate, now)
    return true
  }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))

  const getClientName = (clientId: string) => {
    const c = clients.find((cl) => cl.uid === clientId)
    return c?.displayName || clientId.slice(0, 8)
  }

  const getClientPhone = (clientId: string) => {
    const c = clients.find((cl) => cl.uid === clientId)
    return c?.phone
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ]

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-6">
          <h1 className="font-heading text-3xl text-white">Appointments</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage client sessions</p>
        </div>

        <div className="flex gap-2 mb-6">
          {filters.map((f) => (
            <motion.button
              key={f.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-[#FFB800] text-white"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No appointments"
            description={filter === "upcoming" ? "No upcoming sessions booked yet" : "No past appointments found"}
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((a, i) => {
                const isUpcoming = a.status === "scheduled" && isAfter(new Date(`${a.date}T${a.startTime}`), now)
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl flex items-center justify-center ${
                          a.status === "completed" ? "bg-green-500/20" :
                          a.status === "cancelled" ? "bg-red-500/20" :
                          "bg-[#FFB800]/20"
                        }`}>
                          <User className={`size-5 ${
                            a.status === "completed" ? "text-green-400" :
                            a.status === "cancelled" ? "text-red-400" :
                            "text-[#FFD200]"
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{getClientName(a.clientId)}</p>
                          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <CalendarDays className="size-3" />
                            {format(parseISO(a.date), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="size-3" />
                            {a.startTime} — {a.endTime}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        a.status === "scheduled" ? "bg-blue-500/20 text-blue-400" :
                        a.status === "completed" ? "bg-green-500/20 text-green-400" :
                        "bg-zinc-800 text-zinc-500"
                      }`}>
                        {a.status}
                      </span>
                    </div>
                    {getClientPhone(a.clientId) && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Phone className="size-3 text-zinc-600" />
                        <span className="text-xs text-zinc-500">{getClientPhone(a.clientId)}</span>
                      </div>
                    )}
                    {isUpcoming && (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={processingId === a.id}
                          onClick={() => handleComplete(a.id)}
                          className="flex-1 rounded-lg bg-green-500/20 border border-green-500/30 py-2 text-xs font-medium text-green-400 flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {processingId === a.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          Complete
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={processingId === a.id}
                          onClick={() => handleCancel(a.id)}
                          className="flex-1 rounded-lg bg-red-500/10 border border-red-500/20 py-2 text-xs font-medium text-red-400 flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {processingId === a.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <X className="size-3" />
                          )}
                          Cancel
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </CoachLayout>
  )
}
