"use client"

import { useState, useEffect, useCallback } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAuth } from "@/hooks/useAuth"
import { useClientData } from "@/hooks/useClient"
import { getAppointments, getAvailableSlots, createAppointment, getCoachAvailability } from "@/lib/store"
import { Appointment } from "@/types"
import { motion, AnimatePresence } from "motion/react"
import { CalendarDays, Clock, ChevronLeft, ChevronRight, Check, X, Loader2, Calendar, ArrowLeft } from "lucide-react"
import { format, addDays, isSameDay, parseISO } from "date-fns"
import toast from "react-hot-toast"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function SchedulePage() {
  const { user, profile } = useAuth()
  const { client } = useClientData()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string }[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const coachId = client?.coachId

  const generateWeekDays = useCallback(() => {
    const today = new Date()
    const start = addDays(today, weekOffset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i)
      return format(d, "yyyy-MM-dd")
    })
  }, [weekOffset])

  const [weekDays, setWeekDays] = useState(generateWeekDays())

  useEffect(() => {
    setWeekDays(generateWeekDays())
  }, [generateWeekDays])

  const loadAppointments = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await getAppointments(user.id, "client")
      setAppointments(data)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  const loadSlots = useCallback(async () => {
    if (!coachId) return
    setSlotsLoading(true)
    try {
      const slots = await getAvailableSlots(coachId, selectedDate)
      setAvailableSlots(slots)
    } finally {
      setSlotsLoading(false)
    }
  }, [coachId, selectedDate])

  useEffect(() => {
    if (showBooking && coachId) loadSlots()
  }, [showBooking, coachId, loadSlots])

  const handleBook = async () => {
    if (!user?.id || !coachId || !bookingSlot) return
    setBooking(true)
    try {
      const endHour = parseInt(bookingSlot.split(":")[0]) + 1
      const endTime = `${endHour.toString().padStart(2, "0")}:00`
      await createAppointment({
        clientId: user.id,
        coachId,
        date: selectedDate,
        startTime: bookingSlot,
        endTime,
      })
      toast.success("Session booked!")
      setShowBooking(false)
      setBookingSlot(null)
      await loadAppointments()
    } catch {
      toast.error("Failed to book session")
    } finally {
      setBooking(false)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const { updateAppointmentStatus } = await import("@/lib/store")
      await updateAppointmentStatus(id, "cancelled")
      toast.success("Appointment cancelled")
      await loadAppointments()
    } catch {
      toast.error("Failed to cancel")
    }
  }

  const upcoming = appointments.filter((a) => a.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  const history = appointments.filter((a) => a.status !== "scheduled").slice(0, 20)

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  return (
    <ClientLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-6 text-[#FFB800]" />
            <h1 className="font-heading text-2xl text-white">Schedule</h1>
          </div>
          {coachId && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setShowBooking(true); setWeekOffset(0); setSelectedDate(format(new Date(), "yyyy-MM-dd")) }}
              className="flex items-center gap-1.5 rounded-full bg-[#FFB800] px-4 py-2 text-xs font-medium text-white"
            >
              <Calendar className="size-3.5" />
              Book Session
            </motion.button>
          )}
        </div>
        <p className="text-sm text-zinc-500 mb-6">Manage your coaching sessions</p>

        {upcoming.length > 0 ? (
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Upcoming Sessions</p>
            <div className="space-y-2">
              <AnimatePresence>
                {upcoming.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-[#FFB800]/20 bg-gradient-to-br from-[#FFB800]/5 to-transparent p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-[#FFB800]/20 flex items-center justify-center">
                          <Calendar className="size-5 text-[#FFD200]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {format(parseISO(a.date), "EEEE, MMM d")}
                          </p>
                          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Clock className="size-3" />
                            {a.startTime} — {a.endTime}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCancel(a.id)}
                        className="size-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                      >
                        <X className="size-4 text-zinc-500 hover:text-red-400" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <EmptyState
              icon="📅"
              title="No upcoming sessions"
              description="Book a session with your coach to get started"
            />
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">History</p>
            <div className="space-y-2">
              {history.map((a) => (
                <div key={a.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`size-2 rounded-full ${
                        a.status === "completed" ? "bg-green-500" : "bg-zinc-600"
                      }`} />
                      <p className="text-sm text-zinc-400">
                        {format(parseISO(a.date), "MMM d")} · {a.startTime}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      a.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"
                    }`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
            onClick={() => setShowBooking(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl bg-zinc-900 border border-zinc-800 p-6 sm:rounded-2xl sm:m-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg text-white">Book a Session</h2>
                <button onClick={() => setShowBooking(false)} className="size-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <X className="size-4 text-zinc-400" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setWeekOffset((p) => p - 1)}
                  className="size-8 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <ChevronLeft className="size-4 text-zinc-400" />
                </motion.button>
                <p className="text-sm text-zinc-300 font-medium">
                  {format(parseISO(weekDays[0]), "MMM d")} — {format(parseISO(weekDays[6]), "MMM d, yyyy")}
                </p>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setWeekOffset((p) => p + 1)}
                  className="size-8 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <ChevronRight className="size-4 text-zinc-400" />
                </motion.button>
              </div>

              <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
                {weekDays.map((day) => {
                  const d = parseISO(day)
                  const isToday = isSameDay(d, new Date())
                  const isSelected = day === selectedDate
                  const dayName = DAYS[d.getDay()]
                  return (
                    <motion.button
                      key={day}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setSelectedDate(day); setBookingSlot(null) }}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[52px] transition-all flex-shrink-0 ${
                        isSelected
                          ? "bg-[#FFB800] text-white"
                          : isToday
                          ? "bg-zinc-800 text-zinc-300"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span className="text-[10px] font-medium uppercase">{dayName}</span>
                      <span className="text-sm font-bold">{format(d, "d")}</span>
                    </motion.button>
                  )
                })}
              </div>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 text-[#FFB800] animate-spin" />
                </div>
              ) : availableSlots.length > 0 ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                    Available Slots for {format(parseISO(selectedDate), "MMM d")}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {availableSlots.map((slot) => {
                      const isSelected = bookingSlot === slot.startTime
                      return (
                        <motion.button
                          key={slot.startTime}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setBookingSlot(slot.startTime)}
                          className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-[#FFB800] text-white"
                              : "bg-zinc-800 text-zinc-400 hover:border-[#FFB800]/30 border border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          {slot.startTime}
                        </motion.button>
                      )
                    })}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!bookingSlot || booking}
                    onClick={handleBook}
                    className="w-full rounded-xl bg-[#FFB800] py-3 text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {booking ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {booking ? "Booking..." : bookingSlot ? `Book at ${bookingSlot}` : "Select a time slot"}
                  </motion.button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="size-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No available slots</p>
                  <p className="text-xs text-zinc-600 mt-1">Try another day</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ClientLayout>
  )
}
