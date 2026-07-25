"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { motion, AnimatePresence } from "motion/react"
import { format, addDays } from "date-fns"
import { Calendar, Clock, Phone, Check, XCircle, RefreshCw } from "lucide-react"
import { getCoachBookings, type Booking } from "@/lib/bookings"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"

export default function CoachSchedulePage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState<string>("all")

  useEffect(() => {
    if (!user?.id) return
    loadBookings()
  }, [user?.id])

  async function loadBookings() {
    if (!user?.id) return
    setLoading(true)
    const list = await getCoachBookings(user.id)
    setBookings(list)
    setLoading(false)
  }

  async function handleUpdateStatus(bookingId: string, newStatus: "completed" | "cancelled") {
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId)
    if (error) {
      toast.error("Failed to update booking status")
      return
    }
    toast.success(`Booking status updated to ${newStatus}`)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b))
  }

  const filteredBookings = bookings.filter(b => {
    if (filterDate === "all") return true
    return b.bookingDate === filterDate
  })

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-6 pb-28 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest">Coach Dashboard</span>
          <h1 className="font-heading text-3xl text-text-primary tracking-wide">CALL SCHEDULE &amp; BOOKINGS</h1>
          <p className="text-xs text-text-muted mt-1">Manage 1-on-1 client consultation calls and availability.</p>
        </div>
        <button
          onClick={loadBookings}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card border border-border-subtle text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer transition-colors"
        >
          <RefreshCw className="size-3.5" /> Refresh Schedule
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setFilterDate("all")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            filterDate === "all" ? "bg-accent-gold text-bg-primary" : "bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary"
          }`}
        >
          All Dates ({bookings.length})
        </button>
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(new Date(), i)
          const dateStr = format(d, "yyyy-MM-dd")
          const isSelected = filterDate === dateStr
          const count = bookings.filter(b => b.bookingDate === dateStr).length

          return (
            <button
              key={dateStr}
              onClick={() => setFilterDate(dateStr)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isSelected ? "bg-accent-gold text-bg-primary" : "bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary"
              }`}
            >
              <span>{format(d, "EEE, d MMM")}</span>
              {count > 0 && (
                <span className="px-1.5 text-[10px] rounded-full bg-accent-gold/20 text-accent-gold font-bold">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-8 rounded-full border-2 border-accent-gold border-t-transparent animate-spin" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-bg-card p-12 text-center text-text-muted space-y-3">
          <Calendar className="size-10 mx-auto text-text-muted/40" />
          <p className="text-sm font-semibold text-text-primary">No call bookings found</p>
          <p className="text-xs text-text-muted">Client call bookings will appear here once booked.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map(b => (
            <div
              key={b.id}
              className={`rounded-2xl border bg-bg-card p-5 space-y-4 shadow-lg transition-all ${
                b.status === "confirmed" ? "border-accent-gold/40" : b.status === "completed" ? "border-emerald-500/30 opacity-80" : "border-red-500/30 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    b.status === "confirmed"
                      ? "bg-accent-gold/15 text-accent-gold border border-accent-gold/30"
                      : b.status === "completed"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}>
                    {b.status}
                  </span>
                  <h3 className="font-heading font-bold text-lg text-text-primary mt-2">{b.clientName}</h3>
                </div>
                <div className="size-10 rounded-full bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center font-heading font-bold text-accent-gold">
                  {b.clientName?.charAt(0)}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-text-muted border-t border-b border-border-subtle py-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-accent-gold" />
                  <span>{format(new Date(b.bookingDate), "EEEE, d MMMM yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-accent-gold" />
                  <span>{b.startTime} - {b.endTime} IST</span>
                </div>
                {b.clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-text-muted/60" />
                    <span>{b.clientPhone}</span>
                  </div>
                )}
                {b.notes && (
                  <div className="mt-2 p-2.5 rounded-lg bg-bg-elevated border border-border-subtle text-xs text-text-muted">
                    <span className="text-[10px] font-bold text-accent-gold uppercase block">Client Topic:</span>
                    {b.notes}
                  </div>
                )}
              </div>

              {b.status === "confirmed" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(b.id, "completed")}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/30 cursor-pointer transition-colors"
                  >
                    <Check className="size-3.5" /> Mark Completed
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(b.id, "cancelled")}
                    className="py-2 px-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-500/20 cursor-pointer transition-colors"
                  >
                    <XCircle className="size-3.5" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
