"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { IndianRupee, Download, QrCode, X, Receipt, MessageCircle, Check, ChevronDown } from "lucide-react"
import { format, differenceInCalendarDays } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { generatePaymentReceiptPdf, generateUpiPaymentUrl, markInvoicePaid, DEFAULT_UPI_ID, type Invoice } from "@/lib/payments"
import { waLink } from "@/lib/quick-manage"
import { RazorpayCheckoutButton } from "@/components/payments/RazorpayCheckoutButton"

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
  memberNumber: number | null
  packageName: string | null
  startDate: string | null
  endDate: string | null
  otherCharges: number
  discount: number
  rewardPointsRedeemed: number
  amountPaid: number
}

type FilterKey = "late" | "soon" | "paid" | "all"

function isLate(f: { status: string; dueDate: string }): boolean {
  return f.status !== "paid" && differenceInCalendarDays(new Date(f.dueDate + "T00:00:00"), new Date()) < 0
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "danger" | "gold" | "muted" }) {
  const toneClass = tone === "danger" ? "text-red-600" : tone === "gold" ? "text-accent-orange" : "text-[#181310]"
  return (
    <div className="p-4 rounded-2xl bg-[#F3EDE2] min-h-[92px] flex flex-col justify-between">
      <span className="text-sm font-semibold text-[#8A7F70]">{label}</span>
      <span className={`font-heading font-bold text-xl ${toneClass}`}>₹{value.toLocaleString("en-IN")}</span>
    </div>
  )
}

export default function FeesPage() {
  const supabase = createClient()
  const [fees, setFees] = useState<FeeWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [upiModalFee, setUpiModalFee] = useState<FeeWithClient | null>(null)
  const [filter, setFilter] = useState<FilterKey>("late")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [billingModalFee, setBillingModalFee] = useState<FeeWithClient | null>(null)
  const [billingForm, setBillingForm] = useState({ otherCharges: "0", discount: "0", rewardPointsRedeemed: "0", amountPaid: "0" })
  const [isSavingBilling, setIsSavingBilling] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const coachId = userData.user.id

      const { data: clientRows } = await supabase
        .from("clients")
        .select("id, user_id, member_number, package_name, start_date, end_date")
        .eq("coach_id", coachId)
      const clients = clientRows || []
      if (clients.length === 0) { setFees([]); return }

      const clientIds = clients.map((c: any) => c.id)
      const userIds = clients.map((c: any) => c.user_id).filter((uid: any): uid is string => uid !== null)

      const clientById = new Map(clients.map((c: any) => [c.id, c]))
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
        const client: any = clientById.get(f.client_id)
        return {
          id: f.id,
          clientId: f.client_id,
          amount: Number(f.amount),
          dueDate: f.due_date,
          status: f.status,
          clientName: c.name,
          clientPhone: c.phone,
          clientAvatar: c.avatar,
          invoiceNumber: f.invoice_number || `INV-${f.id.slice(0, 6).toUpperCase()}`,
          memberNumber: client?.member_number ?? null,
          packageName: client?.package_name ?? null,
          startDate: client?.start_date ?? null,
          endDate: client?.end_date ?? null,
          otherCharges: Number(f.other_charges ?? 0),
          discount: Number(f.discount ?? 0),
          rewardPointsRedeemed: Number(f.reward_points_redeemed ?? 0),
          amountPaid: Number(f.amount_paid ?? 0),
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

  function openBillingModal(f: FeeWithClient) {
    setBillingForm({
      otherCharges: String(f.otherCharges),
      discount: String(f.discount),
      rewardPointsRedeemed: String(f.rewardPointsRedeemed),
      amountPaid: String(f.amountPaid),
    })
    setBillingModalFee(f)
  }

  async function handleSaveBilling() {
    if (!billingModalFee) return
    const otherCharges = Number(billingForm.otherCharges) || 0
    const discount = Number(billingForm.discount) || 0
    const rewardPointsRedeemed = Number(billingForm.rewardPointsRedeemed) || 0
    const amountPaid = Number(billingForm.amountPaid) || 0

    setIsSavingBilling(true)
    try {
      const { error } = await supabase
        .from("fees")
        .update({ other_charges: otherCharges, discount, reward_points_redeemed: rewardPointsRedeemed, amount_paid: amountPaid })
        .eq("id", billingModalFee.id)
      if (error) throw error
      setFees((prev) => prev.map((item) => (item.id === billingModalFee.id ? { ...item, otherCharges, discount, rewardPointsRedeemed, amountPaid } : item)))
      toast.success("Billing details saved")
      setBillingModalFee(null)
    } catch {
      toast.error("Failed to save billing details")
    } finally {
      setIsSavingBilling(false)
    }
  }

  async function handleMarkPaid(f: FeeWithClient) {
    const success = await markInvoicePaid(f.id, f.clientName, f.clientPhone)
    if (success) {
      toast.success(`Fee for ${f.clientName} marked as paid & receipt sent!`)
      setFees((prev) => prev.map((item) => (item.id === f.id ? { ...item, status: "paid" } : item)))
    } else {
      toast.error("Failed to mark fee as paid")
    }
  }

  async function handleDownloadReceipt(f: FeeWithClient) {
    const invObj: Invoice = {
      id: f.id,
      clientId: f.clientId,
      invoiceNumber: f.invoiceNumber,
      amount: f.amount,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: f.amount,
      upiId: DEFAULT_UPI_ID,
      status: f.status,
      dueDate: f.dueDate,
      clientName: f.clientName,
      clientPhone: f.clientPhone,
      createdAt: new Date().toISOString(),
      memberNumber: f.memberNumber ?? undefined,
      packageName: f.packageName ?? undefined,
      startDate: f.startDate ?? undefined,
      endDate: f.endDate ?? undefined,
      otherCharges: f.otherCharges,
      discount: f.discount,
      rewardPointsRedeemed: f.rewardPointsRedeemed,
      amountPaid: f.amountPaid,
    }

    const doc = await generatePaymentReceiptPdf(invObj)
    doc.save(`Receipt_${f.invoiceNumber}_${f.clientName.replace(/\s+/g, "_")}.pdf`)
    toast.success("Payment receipt downloaded!")
  }

  const collected = fees.filter((f) => f.status === "paid").reduce((t, f) => t + f.amount, 0)
  const lateTotal = fees.filter(isLate).reduce((t, f) => t + f.amount, 0)
  const soonTotal = fees.filter((f) => f.status !== "paid" && !isLate(f)).reduce((t, f) => t + f.amount, 0)

  const shown = fees
    .filter((f) => (filter === "all" ? true : filter === "paid" ? f.status === "paid" : filter === "late" ? isLate(f) : f.status !== "paid" && !isLate(f)))
    .sort((x, y) => (filter === "paid" ? y.dueDate.localeCompare(x.dueDate) : x.dueDate.localeCompare(y.dueDate)))

  const lateCount = fees.filter(isLate).length
  const filters: { key: FilterKey; label: string }[] = [
    { key: "late", label: `Late${lateCount ? ` (${lateCount})` : ""}` },
    { key: "soon", label: "Coming up" },
    { key: "paid", label: "Paid" },
    { key: "all", label: "All" },
  ]

  function reminderText(f: FeeWithClient): string {
    const first = f.clientName.split(" ")[0]
    const amt = `₹${f.amount.toLocaleString("en-IN")}`
    const due = format(new Date(f.dueDate + "T00:00:00"), "d MMM")
    return isLate(f)
      ? `Hi ${first}, a gentle reminder: your coaching fee of ${amt} was due on ${due}. Kindly pay when you can. Thank you! — Aman`
      : `Hi ${first}, a reminder: your coaching fee of ${amt} is due on ${due}. Thank you! — Aman`
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-5 pt-8 pb-32 max-w-lg mx-auto space-y-5">
        <h1 className="font-heading italic text-4xl">Money</h1>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl h-24 animate-pulse bg-white/10" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Late" value={lateTotal} tone="danger" />
            <Stat label="Coming up" value={soonTotal} tone="muted" />
            <Stat label="Collected" value={collected} tone="gold" />
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`h-11 px-4 rounded-full text-base font-semibold whitespace-nowrap cursor-pointer ${
                filter === t.key ? "bg-accent-orange text-black" : "bg-white/10 text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl h-32 animate-pulse bg-white/10" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl bg-white/5 py-14 flex flex-col items-center gap-3 text-center px-4">
            <IndianRupee className="size-12 text-white/25" />
            <p className="text-lg font-semibold">{filter === "late" ? "No late payments 🎉" : "Nothing here"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((f) => {
              const late = isLate(f)
              const open = expanded === f.id
              const wa = waLink(f.clientPhone || null, reminderText(f))
              const days = differenceInCalendarDays(new Date(f.dueDate + "T00:00:00"), new Date())
              return (
                <div key={f.id} className={`rounded-2xl bg-bg-card border p-4 ${late ? "border-red-500/60" : "border-border-subtle"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold leading-tight">{f.clientName}</p>
                      <p className={`text-base mt-1 ${late ? "text-red-400 font-semibold" : "text-text-muted"}`}>
                        {f.status === "paid"
                          ? "Paid"
                          : late
                            ? `Late by ${-days} day${-days === 1 ? "" : "s"} · was due ${format(new Date(f.dueDate + "T00:00:00"), "d MMM")}`
                            : `Due ${format(new Date(f.dueDate + "T00:00:00"), "d MMM")}`}
                      </p>
                    </div>
                    <p className="font-heading text-2xl text-accent-orange shrink-0">₹{f.amount.toLocaleString("en-IN")}</p>
                  </div>

                  {f.status !== "paid" && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="h-12 rounded-xl bg-[#25D366] text-black font-bold text-base flex items-center justify-center gap-2">
                          <MessageCircle className="size-5" /> Remind
                        </a>
                      ) : (
                        <span className="h-12 rounded-xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
                      )}
                      <button onClick={() => handleMarkPaid(f)} className="h-12 rounded-xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer">
                        <Check className="size-5" /> Paid
                      </button>
                    </div>
                  )}

                  <button onClick={() => setExpanded(open ? null : f.id)} className="mt-3 text-text-muted text-base flex items-center gap-1 cursor-pointer">
                    More <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <div className="mt-3 pt-3 border-t border-border-subtle flex flex-wrap gap-2">
                      {f.status !== "paid" && (
                        <RazorpayCheckoutButton
                          amount={f.amount}
                          feeId={f.id}
                          clientName={f.clientName}
                          clientPhone={f.clientPhone}
                          buttonText="Pay online"
                          className="py-2.5 px-4 text-base font-bold rounded-xl"
                          onSuccess={() => {
                            setFees((prev) => prev.map((item) => (item.id === f.id ? { ...item, status: "paid" } : item)))
                          }}
                        />
                      )}
                      <button onClick={() => setUpiModalFee(f)} className="h-11 px-4 rounded-xl bg-white/10 text-base font-semibold flex items-center gap-2 cursor-pointer">
                        <QrCode className="size-4 text-accent-orange" /> UPI link
                      </button>
                      <button onClick={() => handleDownloadReceipt(f)} className="h-11 px-4 rounded-xl bg-white/10 text-base font-semibold flex items-center gap-2 cursor-pointer">
                        <Download className="size-4 text-accent-orange" /> Bill / receipt
                      </button>
                      <button onClick={() => openBillingModal(f)} className="h-11 px-4 rounded-xl bg-white/10 text-base font-semibold flex items-center gap-2 cursor-pointer">
                        <Receipt className="size-4 text-accent-orange" /> Edit bill
                      </button>
                    </div>
                  )}
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

      {/* Billing Details Modal */}
      <AnimatePresence>
        {billingModalFee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 space-y-4 relative"
              style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
            >
              <button onClick={() => setBillingModalFee(null)} className="absolute top-4 right-4 size-8 rounded-full bg-[#181310]/5 flex items-center justify-center text-[#8A7F70] hover:text-[#181310]">
                <X className="size-4" />
              </button>

              <div>
                <h3 className="font-heading text-xl text-[#181310]">Billing Details</h3>
                <p className="text-xs text-[#8A7F70] mt-1">{billingModalFee.clientName} &middot; Package fees ₹{billingModalFee.amount.toLocaleString("en-IN")}</p>
              </div>

              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#8A7F70]">Other Charges (₹)</label>
                  <input
                    type="number"
                    value={billingForm.otherCharges}
                    onChange={(e) => setBillingForm((p) => ({ ...p, otherCharges: e.target.value }))}
                    className="w-full bg-white border border-[#181310]/10 rounded-lg py-2.5 px-3 text-sm text-[#181310] outline-none focus:border-accent-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#8A7F70]">Discount (₹)</label>
                  <input
                    type="number"
                    value={billingForm.discount}
                    onChange={(e) => setBillingForm((p) => ({ ...p, discount: e.target.value }))}
                    className="w-full bg-white border border-[#181310]/10 rounded-lg py-2.5 px-3 text-sm text-[#181310] outline-none focus:border-accent-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#8A7F70]">Reward Points Redeemed (₹)</label>
                  <input
                    type="number"
                    value={billingForm.rewardPointsRedeemed}
                    onChange={(e) => setBillingForm((p) => ({ ...p, rewardPointsRedeemed: e.target.value }))}
                    className="w-full bg-white border border-[#181310]/10 rounded-lg py-2.5 px-3 text-sm text-[#181310] outline-none focus:border-accent-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-[#8A7F70]">First Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={billingForm.amountPaid}
                    onChange={(e) => setBillingForm((p) => ({ ...p, amountPaid: e.target.value }))}
                    className="w-full bg-white border border-[#181310]/10 rounded-lg py-2.5 px-3 text-sm text-[#181310] outline-none focus:border-accent-orange"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveBilling}
                disabled={isSavingBilling}
                className="w-full py-3 rounded-full bg-accent-orange text-bg-primary text-xs font-bold uppercase tracking-wider disabled:opacity-60"
              >
                {isSavingBilling ? "Saving…" : "Save Billing Details"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
