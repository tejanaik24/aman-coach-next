"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { format, addDays } from "date-fns"
import { Calendar, Clock, CheckCircle2, PhoneCall, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getAvailableTimeSlots, createBooking, getClientBookings, type Booking } from "@/lib/bookings"
import { fireBadgeUnlockConfetti } from "@/lib/badges"
import toast from "react-hot-toast"

export default function ClientSchedulePage() {
  const supabase = createClient()

  const [clientId, setClientId] = useState<string | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string>("")
  const [clientPhone, setClientPhone] = useState<string>("")

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [slots, setSlots] = useState<{ time: string; endTime: string; available: boolean }[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; endTime: string } | null>(null)
  const [notes, setNotes] = useState("")

  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null)

  // Next 7 available dates
  const next7Days = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i))

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("name, phone").eq("id", user.id).single()
      if (profile) {
        setClientName(profile.name || "")
        setClientPhone(profile.phone || "")
      }

      const { data: client } = await supabase.from("clients").select("id, coach_id").eq("user_id", user.id).single()
      if (client) {
        setClientId(client.id)
        setCoachId(client.coach_id || null)
        const userBookings = await getClientBookings(client.id)
        setMyBookings(userBookings)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setLoadingSlots(true)
    setSelectedSlot(null)
    getAvailableTimeSlots(selectedDate, coachId || undefined).then(res => {
      setSlots(res)
      setLoadingSlots(false)
    }).catch(() => setLoadingSlots(false))
  }, [selectedDate, coachId])

  async function handleBookSession() {
    if (!clientId || !selectedSlot) {
      toast.error("Please select a date and time slot")
      return
    }

    setSubmitting(true)
    const res = await createBooking({
      clientId,
      coachId: coachId || "default-coach-id",
      bookingDate: selectedDate,
      startTime: selectedSlot.time,
      endTime: selectedSlot.endTime,
      notes: notes.trim(),
      clientName,
      clientPhone
    })

    setSubmitting(false)

    if (res.success) {
      fireBadgeUnlockConfetti()
      toast.success("1-on-1 Session Booked Successfully!")
      const newBookingObj: Booking = {
        id: res.bookingId || "new",
        clientId,
        coachId: coachId || "default-coach-id",
        bookingDate: selectedDate,
        startTime: selectedSlot.time,
        endTime: selectedSlot.endTime,
        status: "confirmed",
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      }
      setSuccessBooking(newBookingObj)
      setMyBookings(prev => [...prev, newBookingObj])
      setSelectedSlot(null)
      setNotes("")
    } else {
      toast.error(res.error || "Failed to book session")
    }
  }

  const upcomingBookings = myBookings.filter(b => b.status === "confirmed" && new Date(`${b.bookingDate}T${b.startTime}`) >= new Date())

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-6 pb-28 max-w-3xl mx-auto space-y-6">

      {/* Top Header */}
      <div className="border-b border-border-subtle pb-4">
        <span className="text-[10px] font-bold text-accent-orange uppercase tracking-widest">Client Portal</span>
        <h1 className="font-heading text-2xl text-text-primary tracking-wide mt-0.5">BOOK A 1-ON-1 CALL</h1>
        <p className="text-xs text-text-muted mt-1">
          Select an available slot to schedule a strategy and review call with Coach Aman.
        </p>
      </div>

      {/* Upcoming Session Banner */}
      {upcomingBookings.length > 0 && (
        <div className="rounded-2xl border border-accent-orange/40 bg-gradient-to-r from-accent-orange/10 via-bg-card to-bg-card p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-orange flex items-center gap-1.5">
              <PhoneCall className="size-3.5" /> Upcoming Scheduled Call
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-orange/20 text-accent-orange text-[10px] font-bold uppercase border border-accent-orange/30">
              Confirmed
            </span>
          </div>

          {upcomingBookings.slice(0, 1).map(b => (
            <div key={b.id} className="flex items-center justify-between pt-1">
              <div>
                <h3 className="font-bold text-base text-text-primary">
                  {format(new Date(b.bookingDate), "EEEE, d MMMM yyyy")}
                </h3>
                <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5 font-medium">
                  <Clock className="size-3.5 text-accent-orange" /> {b.startTime} - {b.endTime} IST
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Wizard */}
      <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 space-y-6 shadow-xl">

        {/* Step 1: Select Date */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase text-accent-orange tracking-wider flex items-center gap-2">
            <Calendar className="size-4" /> 1. Select Date
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {next7Days.map(d => {
              const dateStr = format(d, "yyyy-MM-dd")
              const isSelected = selectedDate === dateStr
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex-1 min-w-[72px] p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-accent-orange text-bg-primary border-accent-orange font-bold shadow-md scale-105"
                      : "bg-bg-elevated border-border-subtle text-text-muted hover:border-accent-orange/40"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase block tracking-wider">{format(d, "EEE")}</span>
                  <span className="font-heading text-lg leading-tight block mt-0.5">{format(d, "d")}</span>
                  <span className="text-[9px] block opacity-80">{format(d, "MMM")}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Select Time Slot */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase text-accent-orange tracking-wider flex items-center gap-2">
            <Clock className="size-4" /> 2. Select Time Slot (30 Mins)
          </label>

          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <div className="size-6 border-2 border-accent-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="p-4 rounded-xl border border-border-subtle bg-bg-elevated text-center text-xs text-text-muted">
              No available slots for this date.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {slots.map(s => {
                const isSelected = selectedSlot?.time === s.time
                return (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setSelectedSlot(s)}
                    className={`py-3 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      !s.available
                        ? "bg-bg-elevated/50 border-border-subtle text-text-muted line-through cursor-not-allowed"
                        : isSelected
                        ? "bg-accent-orange text-bg-primary border-accent-orange shadow-lg shadow-accent-orange/20 scale-105"
                        : "bg-bg-elevated border-border-subtle text-text-primary hover:border-accent-orange/50"
                    }`}
                  >
                    {s.time}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Step 3: Optional Notes & Submit */}
        {selectedSlot && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-3 border-t border-border-subtle">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-accent-orange tracking-wider">
                3. Call Topic / Notes for Coach (Optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What would you like to discuss on this call? (e.g. Diet adjustments, injury review, workout technique)"
                rows={3}
                className="w-full rounded-xl bg-bg-elevated border border-border-subtle p-3 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent-orange transition-colors resize-none"
              />
            </div>

            <button
              onClick={handleBookSession}
              disabled={submitting}
              className="w-full py-4 rounded-full bg-accent-orange text-bg-primary font-heading font-bold text-xs uppercase tracking-widest shadow-xl shadow-accent-orange/20 hover:bg-accent-orange/90 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? "Confirming Booking..." : `Confirm Call for ${format(new Date(selectedDate), "d MMM")} at ${selectedSlot.time}`}
              <ChevronRight className="size-4" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-2xl border border-accent-orange/50 bg-bg-card p-6 text-center space-y-4 shadow-2xl">
              <div className="size-14 mx-auto rounded-full bg-accent-orange/20 border border-accent-orange flex items-center justify-center text-accent-orange">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h2 className="font-heading text-xl text-text-primary">Call Scheduled!</h2>
                <p className="text-xs text-text-muted mt-1">
                  Your 1-on-1 session is booked with Coach Aman for {format(new Date(successBooking.bookingDate), "d MMMM")} at {successBooking.startTime}.
                </p>
              </div>
              <button
                onClick={() => setSuccessBooking(null)}
                className="w-full py-3 rounded-full bg-accent-orange text-bg-primary text-xs font-bold uppercase tracking-wider"
              >
                Great, Done!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
