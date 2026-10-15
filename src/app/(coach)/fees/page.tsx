"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { IndianRupee, Download, QrCode, X, MessageCircle, Check, ChevronDown, Edit, Trash2, Plus, Settings2, Send } from "lucide-react"
import { format, differenceInCalendarDays } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { generatePaymentReceiptPdf, generateUpiPaymentUrl, markInvoicePaid, DEFAULT_UPI_ID, type Invoice } from "@/lib/payments"
import { COACH_UPI_ID } from "@/lib/upi"
import { paidSoFar, amountDue } from "@/lib/fee-math"
import { mapFeeToBill, type MappedBill } from "@/lib/bill-validation"
import { waLink } from "@/lib/quick-manage"
import PaymentModal from "@/components/coach/PaymentModal"
import { PACKAGES } from "@/lib/package-goal"
import type { Fee } from "@/types"

interface ClientSummaryRow {
  id: string
  user_id: string | null
  member_number: number | null
  package_name: string | null
  start_date: string | null
  end_date: string | null
  fee_amount: number | null
}

interface ProfileSummaryRow {
  id: string
  name: string | null
  phone: string | null
  avatar_url: string | null
}

type FeeWithClient = MappedBill

type FilterKey = "pending" | "late" | "soon" | "paid" | "all"

function isLate(f: FeeWithClient): boolean {
  return amountDue(f) > 0 && differenceInCalendarDays(new Date(f.dueDate + "T00:00:00"), new Date()) < 0
}

function Stat({ label, value, count, tone }: { label: string; value: number; count?: number; tone: "danger" | "gold" | "muted" }) {
  const toneClass = tone === "danger" ? "text-red-600" : tone === "gold" ? "text-accent-orange" : "text-[#181310]"
  return (
    <div className="p-4 rounded-2xl bg-[#F3EDE2] min-h-[92px] flex flex-col justify-between">
      <div className="flex items-center justify-between gap-1">
        <span className="text-sm font-semibold text-[#8A7F70]">{label}</span>
        {count !== undefined && (
          <span className="text-xs font-bold text-[#181310] tabular-nums">{count}</span>
        )}
      </div>
      <span className={`font-heading font-bold text-xl tabular-nums ${toneClass}`}>₹{value.toLocaleString("en-IN")}</span>
    </div>
  )
}

export default function FeesPage() {
  const supabase = createClient()
  const [fees, setFees] = useState<FeeWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [upiModalFee, setUpiModalFee] = useState<FeeWithClient | null>(null)
  const [filter, setFilter] = useState<FilterKey>("pending")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string; packageName?: string | null; startDate?: string | null; endDate?: string | null; feeAmount?: number | null }[]>([])
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<FeeWithClient | null>(null)

  // Package fixed fees modal state (#3)
  const [packageFeesModalOpen, setPackageFeesModalOpen] = useState(false)
  const [packageFeesDraft, setPackageFeesDraft] = useState<Record<string, string>>({})
  const [isSavingPackageFees, setIsSavingPackageFees] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? (await supabase.auth.getUser()).data.user
      if (!user) return
      const coachId = user.id

      const [clientRes, pkgFeesRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, user_id, member_number, package_name, start_date, end_date, fee_amount")
          .eq("coach_id", coachId),
        supabase
          .from("package_fees")
          .select("package_name, fee_amount"),
      ])

      if (pkgFeesRes.data) {
        const draft: Record<string, string> = {}
        for (const row of pkgFeesRes.data as { package_name: string; fee_amount: number }[]) {
          draft[row.package_name] = String(row.fee_amount ?? "")
        }
        setPackageFeesDraft(draft)
      }

      const clients = (clientRes.data || []) as ClientSummaryRow[]
      if (clients.length === 0) {
        setFees([])
        return
      }

      const clientIds = clients.map((c) => c.id)
      const userIds = clients.map((c) => c.user_id).filter((uid): uid is string => uid !== null)

      const clientById = new Map<string, ClientSummaryRow>(clients.map((c) => [c.id, c]))
      const userIdByClientId = new Map<string, string>()
      for (const c of clients) if (c.user_id) userIdByClientId.set(c.id, c.user_id)

      const [profileRes, feeRes] = await Promise.all([
        supabase.from("profiles").select("id, name, phone, avatar_url").in("id", userIds),
        supabase.from("fees").select("*").in("client_id", clientIds).order("due_date", { ascending: true }),
      ])

      const profiles = (profileRes.data || []) as ProfileSummaryRow[]
      const profileByUserId = new Map<string, ProfileSummaryRow>(profiles.map((p) => [p.id, p]))

      function resolveClient(clientId: string): ProfileSummaryRow | undefined {
        const uid = userIdByClientId.get(clientId)
        return uid ? profileByUserId.get(uid) : undefined
      }

      const feeRows = (feeRes.data || []) as Fee[]
      const mapped: FeeWithClient[] = feeRows.map((f) => {
        const client = clientById.get(f.client_id)
        const profile = resolveClient(f.client_id)
        return mapFeeToBill(f, client, profile)
      })
      setFees(mapped)
      setClientOptions(
        clients.map((c) => ({
          id: c.id,
          name: resolveClient(c.id)?.name ?? "Unknown",
          packageName: c.package_name,
          startDate: c.start_date,
          endDate: c.end_date,
          feeAmount: c.fee_amount,
        }))
      )
    } catch {
      toast.error("Failed to load fees")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSavePackageFees() {
    setIsSavingPackageFees(true)
    try {
      const rowsToUpsert = PACKAGES.map((p) => ({
        package_name: p.name,
        fee_amount: Math.max(Number(packageFeesDraft[p.name] || 0), 0),
        currency: "INR",
        updated_at: new Date().toISOString(),
      })).filter((r) => r.fee_amount > 0)

      if (rowsToUpsert.length > 0) {
        const { error } = await supabase.from("package_fees").upsert(rowsToUpsert, { onConflict: "package_name" })
        if (error) throw error
      }
      toast.success("Package fees saved!")
      setPackageFeesModalOpen(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error"
      toast.error("Could not save package fees: " + msg)
    } finally {
      setIsSavingPackageFees(false)
    }
  }

  async function handleUndoPaid(f: FeeWithClient) {
    if (!window.confirm("This will set paid amount back to 0. Continue?")) return
    const { error } = await supabase
      .from("fees")
      .update({ status: "pending", paid_date: null, amount_paid: 0 })
      .eq("id", f.id)
    if (error) { toast.error("Could not update fee: " + error.message); return }
    setFees((prev) => prev.map((item) => (item.id === f.id ? { ...item, status: "pending", paidDate: null, amountPaid: 0 } : item)))
    toast.success("Payment reset to pending")
  }

  async function handleDeleteFee(f: FeeWithClient) {
    if (!window.confirm(`Are you sure you want to delete this payment record for ${f.clientName}?`)) return
    const { error } = await supabase.from("fees").delete().eq("id", f.id)
    if (error) { toast.error("Could not delete payment: " + error.message); return }
    setFees((prev) => prev.filter((item) => item.id !== f.id))
    toast.success("Payment deleted")
  }

  async function handleMarkPaid(f: FeeWithClient) {
    const today = new Date().toISOString().split("T")[0]
    const success = await markInvoicePaid(f.id, f.clientName, f.clientPhone, f.amount)
    if (success) {
      toast.success(`Fee for ${f.clientName} marked as paid`)
      setFees((prev) => prev.map((item) => (item.id === f.id ? { ...item, status: "paid", paidDate: today, amountPaid: item.amount } : item)))
    } else {
      toast.error("Failed to mark fee as paid")
    }
  }

  async function handleDownloadReceipt(f: FeeWithClient) {
    const invObj: Invoice = {
      id: f.id,
      clientId: f.clientId,
      invoiceNumber: f.invoiceNumber,
      packageFee: f.packageFee,
      amount: f.amount,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: f.amount,
      upiId: DEFAULT_UPI_ID,
      status: f.status,
      dueDate: f.dueDate,
      clientName: f.clientName,
      clientPhone: f.clientPhone,
      createdAt: f.createdAt,
      memberNumber: f.memberNumber ?? undefined,
      packageName: f.packageName ?? undefined,
      startDate: f.startDate ?? undefined,
      endDate: f.endDate ?? undefined,
      otherCharges: f.otherCharges,
      discount: f.discount,
      rewardPointsRedeemed: f.rewardPointsRedeemed,
      amountPaid: paidSoFar(f),
    }

    const doc = await generatePaymentReceiptPdf(invObj)
    doc.save(`Invoice_${f.invoiceNumber}_${f.clientName.replace(/\s+/g, "_")}.pdf`)
    toast.success("Bill / receipt downloaded!")
  }

  const collected = fees.reduce((t, f) => t + paidSoFar(f), 0)
  const unpaidFees = fees.filter((f) => amountDue(f) > 0)
  const pendingCount = unpaidFees.length
  const pendingTotal = unpaidFees.reduce((t, f) => t + amountDue(f), 0)
  const overdueFees = unpaidFees.filter(isLate)
  const lateCount = overdueFees.length
  const lateTotal = overdueFees.reduce((t, f) => t + amountDue(f), 0)
  const soonFees = unpaidFees.filter((f) => !isLate(f))
  const soonCount = soonFees.length
  const soonTotal = soonFees.reduce((t, f) => t + amountDue(f), 0)
  const paidCount = fees.filter((f) => amountDue(f) <= 0).length

  const shown = fees
    .filter((f) =>
      filter === "all"
        ? true
        : filter === "paid"
          ? amountDue(f) <= 0
          : filter === "pending"
            ? amountDue(f) > 0
            : filter === "late"
              ? isLate(f)
              : amountDue(f) > 0 && !isLate(f)
    )
    .sort((x, y) => (filter === "paid" ? y.dueDate.localeCompare(x.dueDate) : x.dueDate.localeCompare(y.dueDate)))

  const filters: { key: FilterKey; label: string }[] = [
    { key: "pending", label: `Pending (${pendingCount} · ₹${pendingTotal.toLocaleString("en-IN")})` },
    { key: "late", label: `Overdue (${lateCount} · ₹${lateTotal.toLocaleString("en-IN")})` },
    { key: "soon", label: `Coming up (${soonCount} · ₹${soonTotal.toLocaleString("en-IN")})` },
    { key: "paid", label: `Paid (${paidCount})` },
    { key: "all", label: `All (${fees.length})` },
  ]

  function reminderText(f: FeeWithClient): string {
    const first = f.clientName.trim()
    const dueAmt = amountDue(f)
    const amt = `₹${dueAmt.toLocaleString("en-IN")}`
    const due = format(new Date(f.dueDate + "T00:00:00"), "d MMM")
    return isLate(f)
      ? `Hi ${first}, a gentle reminder: your coaching fee of ${amt} was due on ${due}. Kindly pay via UPI (${COACH_UPI_ID}) when you can. Thank you! — Aman`
      : `Hi ${first}, a reminder: your coaching fee of ${amt} is due on ${due}. You can pay via UPI (${COACH_UPI_ID}). Thank you! — Aman`
  }

  function billWhatsAppText(f: FeeWithClient): string {
    const first = f.clientName.trim()
    const due = format(new Date(f.dueDate + "T00:00:00"), "dd MMM yyyy")
    const paidAmt = paidSoFar(f)
    const balanceDue = amountDue(f)
    const upiLink = generateUpiPaymentUrl(balanceDue || f.amount, f.clientName, f.invoiceNumber)
    const lines = [
      `Hi ${first}, here is your coaching bill from *Aman Khurana Fitness*:`,
      ``,
      `📄 *Invoice #*: ${f.invoiceNumber}`,
      ...(f.packageName ? [`📦 *Package*: ${f.packageName}`] : []),
      `💰 *Package Fee*: ₹${f.packageFee.toLocaleString("en-IN")}`,
      ...(f.discount > 0 ? [`🏷️ *Discount*: −₹${f.discount.toLocaleString("en-IN")}`] : []),
      ...(f.otherCharges > 0 ? [`➕ *Other Charges*: ₹${f.otherCharges.toLocaleString("en-IN")}`] : []),
      `✅ *Final Amount*: ₹${f.amount.toLocaleString("en-IN")}`,
      ...(paidAmt > 0 ? [`💵 *Paid*: ₹${paidAmt.toLocaleString("en-IN")}`] : []),
      `📌 *Amount Due*: ₹${balanceDue.toLocaleString("en-IN")}`,
      `📅 *Due Date*: ${due}`,
      ``,
      `📲 *Pay by UPI*: ${COACH_UPI_ID} (Aman Khurana Fitness)`,
      `🔗 *UPI Link*: ${upiLink}`,
      ``,
      `Thank you! — Aman Khurana (#teamAKF)`,
    ]
    return lines.join("\n")
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-5 pt-8 pb-32 max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-heading italic text-4xl">Money</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPackageFeesModalOpen(true)}
              className="h-11 px-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Settings2 className="size-4 text-accent-orange" /> Package fees
            </button>
            <button
              type="button"
              onClick={() => { setEditingFee(null); setPaymentModalOpen(true) }}
              className="h-11 px-4 rounded-full bg-accent-orange text-black font-bold text-sm flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="size-4" /> Add payment
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl h-24 animate-pulse bg-white/10" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Pending payments" value={pendingTotal} count={pendingCount} tone="gold" />
            <Stat label="Overdue" value={lateTotal} count={lateCount} tone="danger" />
            <Stat label="Coming up" value={soonTotal} count={soonCount} tone="muted" />
            <Stat label="Collected" value={collected} tone="gold" />
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer ${
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
            <p className="text-lg font-semibold">{filter === "late" ? "No overdue payments 🎉" : "Nothing here"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((f) => {
              const late = isLate(f)
              const open = expanded === f.id
              const wa = waLink(f.clientPhone || null, reminderText(f))
              const waBill = waLink(f.clientPhone || null, billWhatsAppText(f))
              const days = differenceInCalendarDays(new Date(f.dueDate + "T00:00:00"), new Date())
              const dueAmt = f.status === "paid" ? f.amount : amountDue(f)
              const paidAmt = paidSoFar(f)
              return (
                <div key={f.id} className={`rounded-2xl bg-bg-card border p-4 ${late ? "border-red-500/60" : "border-border-subtle"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold leading-tight">{f.clientName}</p>
                      {f.packageName && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">{f.packageName}</p>
                      )}
                      <p className={`text-sm mt-1 ${late ? "text-red-400 font-semibold" : "text-text-muted"}`}>
                        {f.status === "paid"
                          ? "Paid"
                          : late
                            ? `Late by ${-days} day${-days === 1 ? "" : "s"} · was due ${format(new Date(f.dueDate + "T00:00:00"), "d MMM")}`
                            : `Due ${format(new Date(f.dueDate + "T00:00:00"), "d MMM")}`}
                      </p>
                      {(f.discount > 0 || f.packageFee !== f.amount) && (
                        <p className="text-xs text-emerald-400 mt-1">
                          Package ₹{f.packageFee.toLocaleString("en-IN")} − Discount ₹{f.discount.toLocaleString("en-IN")} = Final ₹{f.amount.toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-heading text-2xl text-accent-orange">₹{dueAmt.toLocaleString("en-IN")}</p>
                      {paidAmt > 0 && f.status !== "paid" && (
                        <p className="text-[11px] text-text-muted">Paid ₹{paidAmt.toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  </div>

                  {f.status !== "paid" && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="h-11 rounded-xl bg-[#25D366] text-black font-bold text-sm flex items-center justify-center gap-1.5">
                          <MessageCircle className="size-4" /> Remind
                        </a>
                      ) : (
                        <span className="h-11 rounded-xl bg-white/5 text-text-muted text-xs flex items-center justify-center">No number</span>
                      )}
                      <button onClick={() => handleMarkPaid(f)} className="h-11 rounded-xl bg-accent-orange text-black font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer">
                        <Check className="size-4" /> Paid
                      </button>
                    </div>
                  )}

                  {/* Send bill on WhatsApp button right on the bill card (#7) */}
                  <div className="flex items-center gap-2 mt-2">
                    {waBill ? (
                      <a
                        href={waBill}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                      >
                        <Send className="size-3.5 text-[#25D366]" /> Send bill on WhatsApp
                      </a>
                    ) : null}
                    <button
                      onClick={() => handleDownloadReceipt(f)}
                      className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="size-3.5 text-accent-orange" /> Bill / receipt
                    </button>
                  </div>

                  <button onClick={() => setExpanded(open ? null : f.id)} className="mt-3 text-text-muted text-sm flex items-center gap-1 cursor-pointer">
                    More <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <div className="mt-3 pt-3 border-t border-border-subtle flex flex-wrap gap-2">
                      <button onClick={() => setUpiModalFee(f)} className="h-11 px-4 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                        <QrCode className="size-4 text-accent-orange" /> UPI link
                      </button>
                      <button onClick={() => handleDownloadReceipt(f)} className="h-11 px-4 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                        <Download className="size-4 text-accent-orange" /> Bill / receipt
                      </button>
                      {waBill && (
                        <a
                          href={waBill}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 px-4 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-2"
                        >
                          <Send className="size-4 text-[#25D366]" /> Send bill on WhatsApp
                        </a>
                      )}
                      <button onClick={() => { setEditingFee(f); setPaymentModalOpen(true) }} className="h-11 px-4 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                        <Edit className="size-4 text-accent-orange" /> Edit bill
                      </button>
                      {(f.status === "paid" || paidAmt > 0) && (
                        <button onClick={() => handleUndoPaid(f)} className="h-11 px-4 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                          Undo payment
                        </button>
                      )}
                      <button onClick={() => handleDeleteFee(f)} className="h-11 px-4 rounded-xl bg-red-500/20 text-red-400 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                        <Trash2 className="size-4 text-red-400" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Package Fixed Fees Modal (#3) */}
      <AnimatePresence>
        {packageFeesModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md bg-[#111111] border border-[#222222] rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden text-white"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#222222] shrink-0">
                <div>
                  <h2 className="text-lg font-bold font-heading">Fixed Fee per Package</h2>
                  <p className="text-xs text-text-muted mt-0.5">Auto-fills when you add a client or payment (you can still override it).</p>
                </div>
                <button onClick={() => setPackageFeesModalOpen(false)} className="p-2 text-text-muted hover:text-white rounded-xl cursor-pointer">
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                {PACKAGES.map((pkg) => (
                  <div key={pkg.name} className="flex items-center justify-between gap-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{pkg.name}</p>
                      <p className="text-[11px] text-text-muted">{pkg.days} day{pkg.days === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex items-center bg-[#111111] border border-[#333333] rounded-lg px-2.5 h-10 w-32 focus-within:border-accent-orange">
                      <span className="text-accent-orange text-xs font-bold mr-1">₹</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Not set"
                        value={packageFeesDraft[pkg.name] ?? ""}
                        onChange={(e) => setPackageFeesDraft((prev) => ({ ...prev, [pkg.name]: e.target.value }))}
                        className="w-full bg-transparent text-sm text-white outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#222222] shrink-0">
                <button
                  type="button"
                  onClick={handleSavePackageFees}
                  disabled={isSavingPackageFees}
                  className="w-full h-12 rounded-2xl bg-accent-orange text-black font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingPackageFees ? "Saving…" : "Save Package Fees"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPI Link Modal */}
      <AnimatePresence>
        {upiModalFee && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
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
                <p className="text-xs text-[#8A7F70] mt-1">
                  Client: {upiModalFee.clientName} | Due: ₹{amountDue(upiModalFee).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-[#181310] font-mono font-bold mt-1">UPI ID: {COACH_UPI_ID}</p>
              </div>

              <div className="p-3 bg-[#181310]/5 rounded-xl border border-[#181310]/10 text-xs font-mono text-accent-orange break-all select-all">
                {generateUpiPaymentUrl(amountDue(upiModalFee) || upiModalFee.amount, upiModalFee.clientName, upiModalFee.invoiceNumber)}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateUpiPaymentUrl(amountDue(upiModalFee) || upiModalFee.amount, upiModalFee.clientName, upiModalFee.invoiceNumber))
                  toast.success("UPI payment link copied!")
                }}
                className="w-full py-3 rounded-full bg-accent-orange text-bg-primary text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Copy UPI Link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setEditingFee(null) }}
        mode={editingFee ? "edit" : "add"}
        clientId={editingFee?.clientId}
        clientOptions={clientOptions}
        initialFee={editingFee}
        onSuccess={fetchData}
      />
    </div>
  )
}
