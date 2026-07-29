"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { IndianRupee, Bell, Download, QrCode, Send, X } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import { useCountUp } from "@/hooks/useCountUp"
import { generateGstInvoicePdf, generateUpiPaymentUrl, markInvoicePaid, sendPaymentReminderWhatsApp, type Invoice } from "@/lib/payments"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface FeeWithClient {
  id: string
  clientId: string
  amount: number
  dueDate: string
  status: "pending" | "paid" | "overdue"
  clientName: string
  clientPhone: string
  clientAvatar: string | null
  invoiceNumber: string
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "paid") return "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 font-bold"
  if (status === "overdue") return "bg-red-500/15 border border-red-500/50 text-red-700 font-bold animate-pulse"
  return "bg-amber-500/15 border border-amber-500/40 text-amber-700 font-bold"
}

function RevenueStat({ label, value, tone }: { label: string; value: number; tone: "gold" | "danger" | "muted" }) {
  const count = useCountUp(value)
  const toneClass = tone === "gold" ? "text-accent-orange" : tone === "danger" ? "text-red-600" : "text-[#181310]"
  const labelClass = tone === "danger" ? "text-red-600" : "text-[#8A7F70]"
  return (
    <div
      className="reveal-item p-4 rounded-2xl flex flex-col justify-between h-[90px]"
      style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
    >
      <span className={`text-[10px] font-bold uppercase tracking-wider ${labelClass}`}>{label}</span>
      <span className={`font-heading font-bold text-xl ${toneClass}`}>₹{count.toLocaleString("en-IN")}</span>
    </div>
  )
}

export default function FeesPage() {
  const supabase = createClient()
  const [fees, setFees] = useState<FeeWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [upiModalFee, setUpiModalFee] = useState<FeeWithClient | null>(null)
  const [reminderModalFee, setReminderModalFee] = useState<FeeWithClient | null>(null)

  const statsRef = useStaggerReveal<HTMLDivElement>([isLoading])
  const listRef = useStaggerReveal<HTMLDivElement>([isLoading])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const coachId = userData.user.id

      const { data: clientRows } = await supabase.from("clients").select("id, user_id").eq("coach_id", coachId)
      const clients = clientRows || []
      if (clients.length === 0) { setFees([]); return }

      const clientIds = clients.map((c: any) => c.id)
      const userIds = clients.map((c: any) => c.user_id).filter((uid: any): uid is string => uid !== null)

      const userIdByClientId = new Map<string, string>()
      for (const c of clients) if ((c as any).user_id) userIdByClientId.set((c as any).id, (c as any).user_id)

      const { data: profileRows } = await supabase.from("profiles").select("id, name, phone, avatar_url").in("id", userIds)
      const profiles = profileRows || []
      const profileByUserId = new Map(profiles.map((p: any) => [p.id, p]))

      function resolveClient(clientId: string): { name: string; phone: string; avatar: string | null } {
        const uid = userIdByClientId.get(clientId)
        const p: any = uid ? profileByUserId.get(uid) : undefined
        return { name: p?.name ?? "Unknown", phone: p?.phone ?? "", avatar: p?.avatar_url ?? null }
      }

      const { data: feeRows } = await supabase
        .from("fees")
        .select("*")
        .in("client_id", clientIds)
        .order("due_date", { ascending: true })

      const mapped: FeeWithClient[] = (feeRows || []).map((f: any) => {
        const c = resolveClient(f.client_id)
        return {
          id: f.id,
          clientId: f.client_id,
          amount: Number(f.amount),
          dueDate: f.due_date,
          status: f.status,
          clientName: c.name,
          clientPhone: c.phone,
          clientAvatar: c.avatar,
          invoiceNumber: `INV-${f.id.slice(0, 6).toUpperCase()}`
        }
      })
      setFees(mapped)
    } catch {
      toast.error("Failed to load fees")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleMarkPaid(f: FeeWithClient) {
    const success = await markInvoicePaid(f.id, f.clientName, f.clientPhone)
    if (success) {
      toast.success(`Fee for ${f.clientName} marked as paid & receipt sent!`)
      setFees((prev) => prev.map((item) => (item.id === f.id ? { ...item, status: "paid" } : item)))
    } else {
      toast.error("Failed to mark fee as paid")
    }
  }

  function handleDownloadGstInvoice(f: FeeWithClient) {
    const invObj: Invoice = {
      id: f.id,
      clientId: f.clientId,
      invoiceNumber: f.invoiceNumber,
      amount: f.amount,
      gstRate: 18,
      gstAmount: f.amount * 0.18,
      totalAmount: f.amount * 1.18,
      upiId: "amankhurana@upi",
      status: f.status,
      dueDate: f.dueDate,
      clientName: f.clientName,
      clientPhone: f.clientPhone,
      createdAt: new Date().toISOString()
    }

    const doc = generateGstInvoicePdf(invObj)
    doc.save(`GST_Invoice_${f.invoiceNumber}_${f.clientName.replace(/\s+/g, "_")}.pdf`)
    toast.success("GST Tax Invoice downloaded!")
  }

  async function handleSendReminder(f: FeeWithClient, reminderType: "1week_before" | "1day_before" | "1week_overdue") {
    if (!f.clientPhone) {
      toast.error("Client phone number not available")
      return
    }
    const res = await sendPaymentReminderWhatsApp(f.clientPhone, f.clientName, f.amount, f.dueDate, reminderType)
    if (res.success) {
      toast.success(`WhatsApp reminder sent to ${f.clientName}!`)
      setReminderModalFee(null)
    } else {
      toast.error("Failed to send WhatsApp reminder")
    }
  }

  const revenue = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0)
  const overdue = fees.filter((f) => f.status === "overdue").reduce((s, f) => s + f.amount, 0)
  const pending = fees.filter((f) => f.status === "pending").reduce((s, f) => s + f.amount, 0)

  const chartData = [
    { month: "Jan", revenue: revenue * 0.7 },
    { month: "Feb", revenue: revenue * 0.85 },
    { month: "Mar", revenue: revenue * 0.9 },
    { month: "Apr", revenue: revenue * 0.95 },
    { month: "May", revenue: revenue * 1.1 },
    { month: "Jun", revenue: revenue },
  ]

  return (
    <div className="relative min-h-screen bg-bg-primary">
      <div className="ghost-bg" style={{ backgroundImage: "url(/images/backgrounds/ghost-fees.jpg)" }} />
      <div className="grain-overlay" />
      <div className="relative z-10 px-5 pt-2 space-y-6 pb-28 text-text-primary max-w-6xl mx-auto">

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <span className="text-[10px] font-bold text-accent-orange uppercase tracking-widest">Coach Dashboard</span>
          <h1 className="font-heading text-3xl text-text-primary tracking-wide">FEE LEDGER &amp; PAYMENTS</h1>
          <p className="text-xs text-text-muted mt-1">Track client subscriptions, overdue fees, UPI links, and GST tax invoices.</p>
        </div>
      </div>

      {/* Summary Bento Stats */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-bg-card rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : (
        <div ref={statsRef} className="grid grid-cols-3 gap-3 select-none">
          <RevenueStat label="Total Collected" value={revenue} tone="gold" />
          <RevenueStat label="Overdue Fees" value={overdue} tone="danger" />
          <RevenueStat label="Pending Fees" value={pending} tone="muted" />
        </div>
      )}

      {/* Monthly Revenue Chart */}
      {!isLoading && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm text-[#181310] uppercase tracking-wider">Monthly Revenue Trend</h3>
            <span className="text-xs text-accent-orange font-bold">INR (₹)</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: "#8A7F70", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A7F70", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#FF6A1A", borderRadius: "8px", fontSize: "12px", color: "#FF6A1A" }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#FF6A1A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fee Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base text-text-primary uppercase tracking-wider">Client Fee Ledger</h3>
          <span className="text-xs text-text-muted font-medium">{fees.length} Total Entries</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-bg-card rounded-2xl h-20 animate-pulse" />)}
          </div>
        ) : fees.length === 0 ? (
          <div className="rounded-2xl py-16 flex flex-col items-center gap-4 text-center" style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}>
            <IndianRupee className="size-12 text-[#181310]/25" />
            <p className="text-[#181310] font-heading font-bold text-sm">No fees recorded</p>
          </div>
        ) : (
          <div ref={listRef} className="space-y-3">
            {fees.map((f) => {
              const initials = getInitials(f.clientName)
              return (
                <div
                  key={f.id}
                  className={`reveal-item rounded-2xl border p-5 transition-all ${
                    f.status === "overdue" ? "border-red-400" : f.status === "paid" ? "border-emerald-400" : "border-transparent"
                  }`}
                  style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {f.clientAvatar ? (
                        <img src={f.clientAvatar} alt={f.clientName} className="size-11 rounded-full object-cover flex-shrink-0 border border-[#181310]/10" />
                      ) : (
                        <div className="size-11 rounded-full bg-[#181310]/5 border border-accent-orange/40 flex items-center justify-center flex-shrink-0 font-heading font-bold text-accent-orange">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[#181310] font-bold text-sm truncate">{f.clientName}</p>
                          <span className="text-[10px] text-[#8A7F70] font-mono">({f.invoiceNumber})</span>
                        </div>
                        <p className="text-xs text-[#8A7F70] mt-0.5 font-medium">
                          Due: <strong className="text-[#181310]">{format(new Date(f.dueDate), "d MMM yyyy")}</strong> · Amount: <strong className="text-accent-orange">₹{f.amount.toLocaleString("en-IN")}</strong>
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] uppercase px-3 py-1 rounded-full ${statusBadge(f.status)}`}>
                      {f.status}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[#181310]/[0.08]">
                    {(f.status === "pending" || f.status === "overdue") && (
                      <button
                        onClick={() => handleMarkPaid(f)}
                        className="py-2 px-4 rounded-xl bg-accent-orange text-bg-primary text-xs font-bold uppercase tracking-wider hover:bg-accent-orange/90 transition-all cursor-pointer"
                      >
                        Mark Paid
                      </button>
                    )}

                    <button
                      onClick={() => setUpiModalFee(f)}
                      className="py-2 px-3.5 rounded-xl bg-[#181310]/5 border border-[#181310]/10 text-xs font-bold text-[#8A7F70] hover:text-[#181310] flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="size-3.5 text-accent-orange" /> UPI Link
                    </button>

                    <button
                      onClick={() => handleDownloadGstInvoice(f)}
                      className="py-2 px-3.5 rounded-xl bg-[#181310]/5 border border-[#181310]/10 text-xs font-bold text-[#8A7F70] hover:text-[#181310] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="size-3.5 text-accent-orange" /> GST Invoice
                    </button>

                    {(f.status === "pending" || f.status === "overdue") && (
                      <button
                        onClick={() => setReminderModalFee(f)}
                        className="py-2 px-3.5 rounded-xl bg-[#181310]/5 border border-[#181310]/10 text-xs font-bold text-[#8A7F70] hover:text-[#181310] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Bell className="size-3.5 text-accent-orange" /> WhatsApp Reminder
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* UPI Link Modal */}
      <AnimatePresence>
        {upiModalFee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 text-center space-y-4 relative"
              style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
            >
              <button onClick={() => setUpiModalFee(null)} className="absolute top-4 right-4 size-8 rounded-full bg-[#181310]/5 flex items-center justify-center text-[#8A7F70] hover:text-[#181310]">
                <X className="size-4" />
              </button>

              <div className="size-14 mx-auto rounded-full bg-accent-orange/15 border border-accent-orange/30 flex items-center justify-center text-accent-orange">
                <QrCode className="size-7" />
              </div>

              <div>
                <h3 className="font-heading text-xl text-[#181310]">UPI Payment Link</h3>
                <p className="text-xs text-[#8A7F70] mt-1">Client: {upiModalFee.clientName} | Amount: ₹{upiModalFee.amount.toLocaleString("en-IN")}</p>
              </div>

              <div className="p-3 bg-[#181310]/5 rounded-xl border border-[#181310]/10 text-xs font-mono text-accent-orange break-all select-all">
                {generateUpiPaymentUrl(upiModalFee.amount, upiModalFee.clientName, upiModalFee.invoiceNumber)}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateUpiPaymentUrl(upiModalFee.amount, upiModalFee.clientName, upiModalFee.invoiceNumber))
                  toast.success("UPI payment link copied!")
                }}
                className="w-full py-3 rounded-full bg-accent-orange text-bg-primary text-xs font-bold uppercase tracking-wider"
              >
                Copy UPI Link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Reminder Modal */}
      <AnimatePresence>
        {reminderModalFee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 text-center space-y-4 relative"
              style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
            >
              <button onClick={() => setReminderModalFee(null)} className="absolute top-4 right-4 size-8 rounded-full bg-[#181310]/5 flex items-center justify-center text-[#8A7F70] hover:text-[#181310]">
                <X className="size-4" />
              </button>

              <div className="size-14 mx-auto rounded-full bg-accent-orange/15 border border-accent-orange/30 flex items-center justify-center text-accent-orange">
                <Bell className="size-7" />
              </div>

              <div>
                <h3 className="font-heading text-xl text-[#181310]">Send Payment Reminder</h3>
                <p className="text-xs text-[#8A7F70] mt-1">Select reminder type for {reminderModalFee.clientName}:</p>
              </div>

              <div className="space-y-2 text-left">
                <button
                  onClick={() => handleSendReminder(reminderModalFee, "1week_before")}
                  className="w-full p-3 rounded-xl bg-[#181310]/5 border border-[#181310]/10 hover:border-accent-orange text-xs text-[#181310] font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>1 Week Before Due Date</span>
                  <Send className="size-3.5 text-accent-orange" />
                </button>
                <button
                  onClick={() => handleSendReminder(reminderModalFee, "1day_before")}
                  className="w-full p-3 rounded-xl bg-[#181310]/5 border border-[#181310]/10 hover:border-accent-orange text-xs text-[#181310] font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>1 Day Before Due Date</span>
                  <Send className="size-3.5 text-accent-orange" />
                </button>
                <button
                  onClick={() => handleSendReminder(reminderModalFee, "1week_overdue")}
                  className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500 text-xs text-red-700 font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>1 Week Overdue Alert</span>
                  <Send className="size-3.5 text-red-700" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
