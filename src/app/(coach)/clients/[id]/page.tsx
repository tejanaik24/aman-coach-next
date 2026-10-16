"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowLeft,
  Dumbbell,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  MessageCircle,
  Phone,
  CalendarPlus,
  Edit,
  Trash2,
  Plus,
  Download,
  Send,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import BadgesGrid from "@/components/client/BadgesGrid"
import { getClientBadges, type ClientBadge } from "@/lib/badges"
import AddFollowupSheet from "@/components/coach/AddFollowupSheet"
import ChangeDateSheet from "@/components/coach/ChangeDateSheet"
import SendPlanPanel from "@/components/coach/SendPlanPanel"
import EditClientSheet from "@/components/coach/EditClientSheet"
import PaymentModal from "@/components/coach/PaymentModal"
import { waLink, buildFollowupWaText } from "@/lib/quick-manage"
import { generatePaymentReceiptPdf, generateUpiPaymentUrl, DEFAULT_UPI_ID, type Invoice } from "@/lib/payments"
import { COACH_UPI_ID, COACH_BANK } from "@/lib/upi"
import { finalAmount, paidSoFar, amountDue } from "@/lib/fee-math"
import { mapFeeToBill, type MappedBill } from "@/lib/bill-validation"
import type { ClientWithProfile, Checkin, Fee, WorkoutPlan, NutritionPlan } from "@/types"
import { openUrl } from "@/lib/utils"

type Tab = "overview" | "checkins" | "plans" | "fees"

const FOLLOWUP_LABEL: Record<string, string> = { checkin: "Check-in", payment: "Payment", renewal: "Renewal", feedback: "Feedback", birthday: "Birthday", other: "Follow-up" }

// Check-ins come in two shapes: older ones nest answers (form_data.training...), the current
// 27-step form saves flat keys (t3_workout_deviation...). Read whichever is there.
function flatField(c: Checkin, key: string): string | undefined {
  const v = (c.form_data as unknown as Record<string, unknown> | null)?.[key]
  return v == null || v === "" ? undefined : String(v)
}

// Optional BCA report path stored inside the existing check-in form_data (no schema change).
function bcaReportPath(c: Checkin): string | null {
  const v = (c.form_data as unknown as Record<string, unknown> | null)?.bca_report
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0]
  if (typeof v === "string" && v) return v
  return null
}

async function openCheckinFile(path: string) {
  try {
    const res = await fetch(`/api/checkin/photo-url?path=${encodeURIComponent(path)}`)
    if (!res.ok) throw new Error()
    const { url } = await res.json()
    openUrl(url)
  } catch {
    toast.error("Could not open file")
  }
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "active") return "bg-accent-orange text-bg-primary"
  return "bg-bg-elevated text-text-muted"
}

function feeStatusBadge(status: string): string {
  if (status === "paid") return "bg-accent-orange/15 border border-accent-orange/30 text-accent-orange"
  if (status === "overdue") return "bg-danger/10 border border-danger/30 text-danger"
  return "bg-bg-elevated text-text-muted"
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null || value === undefined) return null
  const pct = (value / 10) * 100
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary font-bold">{value}/10</span>
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-accent-orange transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton-pulse rounded ${className ?? ""}`} />
}

export default function ClientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [client, setClient] = useState<ClientWithProfile | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [fees, setFees] = useState<Fee[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([])
  const [clientBadges, setClientBadges] = useState<ClientBadge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)
  const [followups, setFollowups] = useState<{ id: string; type: string; due_date: string; note: string | null }[]>([])
  const [followupOpen, setFollowupOpen] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [dateFor, setDateFor] = useState<{ id: string; due: string } | null>(null)
  const [joiningForms, setJoiningForms] = useState<{ id: string; form_type: string; submitted_at: string }[]>([])
  const [unattachedForms, setUnattachedForms] = useState<{ id: string; form_type: string; submitted_at: string; senderName: string }[]>([])
  const [selectedFormId, setSelectedFormId] = useState("")
  const [attachingForm, setAttachingForm] = useState(false)

  const actionsRef = useStaggerReveal<HTMLDivElement>([isLoading])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [clientRes, r1, r2, r3, r4, badges, r5, formsRes, unattachedRes] = await Promise.allSettled([
      supabase.from("clients").select("*, profile:profiles!user_id(*)").eq("id", id).single(),
      supabase.from("checkins").select("*").eq("client_id", id).order("submitted_at", { ascending: false }),
      supabase.from("fees").select("*").eq("client_id", id).order("due_date", { ascending: false }),
      supabase.from("workout_plans").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("nutrition_plans").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      getClientBadges(id),
      supabase.from("followups").select("id, type, due_date, note").eq("client_id", id).is("done_at", null).not("auto_created", "is", true).order("due_date").limit(5),
      supabase.from("form_submissions").select("id, form_type, submitted_at").eq("client_id", id).in("form_type", ["standard_joining", "antenatal_joining"]).order("submitted_at", { ascending: false }),
      supabase.from("form_submissions").select("id, form_type, submitted_at, sender:form_data->>q1_name").is("client_id", null).in("form_type", ["standard_joining", "antenatal_joining"]).order("submitted_at", { ascending: false }).limit(30),
    ])

    if (clientRes.status === "fulfilled" && clientRes.value.data) {
      const raw = clientRes.value.data as unknown as ClientWithProfile & { profile: ClientWithProfile["profile"] | ClientWithProfile["profile"][] }
      const prof = Array.isArray(raw.profile) ? raw.profile[0] ?? null : raw.profile
      setClient({ ...raw, profile: prof })
    } else {
      setIsLoading(false)
      return
    }

    if (r1.status === "fulfilled") setCheckins(r1.value.data ?? [])
    if (r2.status === "fulfilled") setFees(r2.value.data ?? [])
    if (r3.status === "fulfilled") setWorkoutPlans(r3.value.data ?? [])
    if (r4.status === "fulfilled") setNutritionPlans(r4.value.data ?? [])
    if (badges.status === "fulfilled") setClientBadges(badges.value)
    if (r5.status === "fulfilled") setFollowups(r5.value.data ?? [])
    if (formsRes.status === "fulfilled") setJoiningForms((formsRes.value.data ?? []) as { id: string; form_type: string; submitted_at: string }[])
    if (unattachedRes.status === "fulfilled") {
      const list = ((unattachedRes.value.data ?? []) as unknown as { id: string; form_type: string; submitted_at: string; sender: string | null }[]).map((u) => ({
        id: u.id,
        form_type: u.form_type,
        submitted_at: u.submitted_at,
        senderName: u.sender || "Questionnaire",
      }))
      setUnattachedForms(list)
    }
    setIsLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleAttachQuestionnaire() {
    if (!selectedFormId || !client || attachingForm) return
    setAttachingForm(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("form_submissions")
      .update({ client_id: client.id, user_id: client.user_id })
      .eq("id", selectedFormId)
    setAttachingForm(false)
    if (error) {
      toast.error("Could not attach questionnaire")
      return
    }
    toast.success("Questionnaire attached to client profile")
    setSelectedFormId("")
    fetchData()
  }

  async function sendLoginLink() {
    if (sendingLink) return
    setSendingLink(true)
    try {
      const res = await fetch(`/api/coach/clients/${id}/login-link`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) { toast.error(data.error ?? "Could not make the login link"); return }
      const first = (client?.profile?.name ?? "").trim() || "there"
      const text = `Hi ${first}, tap this link to open your Aman Khurana Fitness app (no password needed): ${data.url}`
      const wa = waLink(client?.profile?.phone ?? null, text)
      if (!wa) { await navigator.clipboard.writeText(data.url); toast.success("No number saved. Link copied."); return }
      openUrl(wa)
    } catch {
      toast.error("Could not make the login link")
    } finally {
      setSendingLink(false)
    }
  }

  async function handleMarkAsPaid(feeId: string) {
    const supabase = createClient()
    const paidDate = new Date().toISOString().split("T")[0]
    const targetFee = fees.find((f) => f.id === feeId)
    const fullAmt = targetFee ? finalAmount(targetFee) : 0
    const { error } = await supabase
      .from("fees")
      .update({ status: "paid", paid_date: paidDate, amount_paid: fullAmt })
      .eq("id", feeId)
    if (error) { toast.error("Failed to update fee"); return }
    setFees((prev) =>
      prev.map((f) => (f.id === feeId ? { ...f, status: "paid" as const, paid_date: paidDate, amount_paid: fullAmt } : f))
    )
    toast.success("Fee marked as paid")
  }

  async function handleSaveFeedback(checkinId: string) {
    const feedback = feedbackDraft[checkinId]
    if (!feedback?.trim()) return
    setSavingFeedback(checkinId)
    const response = await fetch(`/api/coach/checkins/${checkinId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: feedback.trim() }),
    })
    setSavingFeedback(null)
    if (!response.ok) { toast.error("Failed to save feedback"); return }
    const now = new Date().toISOString()
    setCheckins((prev) => prev.map((c) => (c.id === checkinId ? { ...c, coach_feedback: feedback.trim(), reviewed_at: now } : c)))
    setFeedbackDraft((prev) => ({ ...prev, [checkinId]: "" }))
    toast.success("Feedback saved")
  }

  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<MappedBill | null>(null)

  const handleRemoveFollowup = async (fId: string) => {
    if (!window.confirm("Are you sure you want to remove this follow-up?")) return
    const supabase = createClient()
    const { error } = await supabase.from("followups").delete().eq("id", fId)
    if (error) { toast.error("Could not remove follow-up"); return }
    setFollowups((prev) => prev.filter((f) => f.id !== fId))
    toast.success("Follow-up removed")
  }

  const handleChangeFollowupDate = (fId: string, currentDue: string) => setDateFor({ id: fId, due: currentDue })

  const saveFollowupDate = async (newDate: string) => {
    if (!dateFor) return
    const supabase = createClient()
    const { data, error } = await supabase.from("followups").update({ due_date: newDate, auto_created: false }).eq("id", dateFor.id).select("id")
    if (error || !data || data.length !== 1) { toast.error("Could not save. Try again."); return }
    setFollowups((prev) => prev.map((f) => (f.id === dateFor.id ? { ...f, due_date: newDate } : f)))
    setDateFor(null)
    toast.success("Date updated")
  }

  const handleEditFollowupNote = async (fId: string, currentNote: string | null) => {
    const next = window.prompt("Follow-up note", currentNote ?? "")
    if (next === null) return
    const note = next.trim()
    const supabase = createClient()
    const { data, error } = await supabase.from("followups").update({ note: note || null, auto_created: false }).eq("id", fId).select("id")
    if (error || !data || data.length !== 1) { toast.error("Could not save. Try again."); return }
    setFollowups((prev) => prev.map((f) => (f.id === fId ? { ...f, note: note || null } : f)))
    toast.success("Note updated")
  }

  const handleDeleteCheckin = async (cId: string) => {
    if (!window.confirm("Are you sure you want to delete this check-in?")) return
    const supabase = createClient()
    const { error } = await supabase.from("checkins").delete().eq("id", cId)
    if (error) { toast.error("Could not delete check-in"); return }
    setCheckins((prev) => prev.filter((c) => c.id !== cId))
    toast.success("Check-in deleted")
  }

  const handleUndoPaid = async (feeId: string) => {
    if (!window.confirm("This will set paid amount back to 0. Continue?")) return
    const supabase = createClient()
    const { error } = await supabase
      .from("fees")
      .update({ status: "pending", paid_date: null, amount_paid: 0 })
      .eq("id", feeId)
    if (error) { toast.error("Could not update fee"); return }
    setFees((prev) =>
      prev.map((f) => (f.id === feeId ? { ...f, status: "pending" as const, paid_date: null, amount_paid: 0 } : f))
    )
    toast.success("Payment reset to pending")
  }

  const handleDeleteFee = async (feeId: string) => {
    if (!window.confirm("Are you sure you want to delete this payment record?")) return
    const supabase = createClient()
    const { error } = await supabase.from("fees").delete().eq("id", feeId)
    if (error) { toast.error("Could not delete payment record"); return }
    setFees((prev) => prev.filter((f) => f.id !== feeId))
    toast.success("Payment deleted")
  }

  const name = client?.profile?.name ?? "Unknown"
  const phone = client?.profile?.phone
  const avatarUrl = client?.profile?.avatar_url ?? null
  const waHref = waLink(phone ?? null, `Dear ${name.trim()}, `)
  const daysActive = client ? differenceInDays(new Date(), new Date(client.start_date)) : 0
  const activeWorkout = workoutPlans.find((p) => p.is_active)
  const activeNutrition = nutritionPlans.find((p) => p.is_active)
  const totalPaid = fees.reduce((s, f) => s + paidSoFar(f), 0)
  const totalPending = fees.reduce((s, f) => s + amountDue(f), 0)

  function resolveFeeMetrics(f: Fee) {
    const mapped = mapFeeToBill(f, client, client?.profile)
    return {
      mapped,
      amount: mapped.amount,
      discount: mapped.discount,
      otherCharges: mapped.otherCharges,
      rewardPoints: mapped.rewardPointsRedeemed,
      packageFee: mapped.packageFee,
      amountPaid: mapped.amountPaid,
      balanceDue: mapped.balanceDue,
      invNum: mapped.invoiceNumber,
      pkgName: mapped.packageName,
    }
  }

  function buildClientBillWaText(f: Fee): string {
    const m = resolveFeeMetrics(f)
    const first = name.trim()
    const due = format(new Date(f.due_date + "T00:00:00"), "dd MMM yyyy")
    const upiLink = generateUpiPaymentUrl(m.balanceDue || m.amount, name, m.invNum)
    const lines = [
      `Hi ${first}, here is your coaching bill from *Aman Khurana Fitness*:`,
      ``,
      `📄 *Invoice #*: ${m.invNum}`,
      ...(m.pkgName ? [`📦 *Package*: ${m.pkgName}`] : []),
      `💰 *Package Fee*: ₹${m.packageFee.toLocaleString("en-IN")}`,
      ...(m.discount > 0 ? [`🏷️ *Discount*: −₹${m.discount.toLocaleString("en-IN")}`] : []),
      ...(m.otherCharges > 0 ? [`➕ *Other Charges*: ₹${m.otherCharges.toLocaleString("en-IN")}`] : []),
      `✅ *Final Amount*: ₹${m.amount.toLocaleString("en-IN")}`,
      ...(m.amountPaid > 0 ? [`💵 *Paid*: ₹${m.amountPaid.toLocaleString("en-IN")}`] : []),
      `📌 *Amount Due*: ₹${m.balanceDue.toLocaleString("en-IN")}`,
      `📅 *Due Date*: ${due}`,
      ``,
      `📲 *Pay by UPI*: ${COACH_UPI_ID} (Aman Khurana Fitness)`,
      `🔗 *UPI Link*: ${upiLink}`,
      ``,
      `🏦 *Bank Transfer* (${COACH_BANK.bank})`,
      `A/c No: ${COACH_BANK.accountNo}`,
      `IFSC: ${COACH_BANK.ifsc}`,
      ``,
      `Thank you! — Aman Khurana (#teamAKF)`,
    ]
    return lines.join("\n")
  }

  async function handleDownloadClientReceipt(f: Fee) {
    const m = resolveFeeMetrics(f)
    const invObj: Invoice = {
      id: f.id,
      clientId: f.client_id,
      invoiceNumber: m.invNum,
      packageFee: m.packageFee,
      amount: m.amount,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: m.amount,
      upiId: DEFAULT_UPI_ID,
      status: f.status,
      dueDate: f.due_date,
      clientName: name,
      clientPhone: phone ?? "",
      createdAt: f.created_at || new Date().toISOString(),
      memberNumber: client?.member_number ?? undefined,
      packageName: m.pkgName ?? undefined,
      startDate: client?.start_date ?? undefined,
      endDate: client?.end_date ?? undefined,
      otherCharges: m.otherCharges,
      discount: m.discount,
      rewardPointsRedeemed: m.rewardPoints,
      amountPaid: m.amountPaid,
    }
    const doc = await generatePaymentReceiptPdf(invObj)
    doc.save(`Invoice_${m.invNum}_${name.replace(/\s+/g, "_")}.pdf`)
    toast.success("Bill / receipt downloaded!")
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "checkins", label: "Check-ins" },
    { key: "plans", label: "Plans" },
    { key: "fees", label: "Money" },
  ]

  return (
    <div className="bg-bg-primary min-h-full pb-24">
      {/* Hero header */}
      <div className="relative w-full h-[220px] overflow-hidden bg-bg-elevated">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-accent-orange font-heading font-bold text-6xl">{name !== "Unknown" ? getInitials(name) : ""}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-black/30 to-transparent" />

        <button
          onClick={() => router.push("/clients")}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-text-primary cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute bottom-4 left-5 right-5">
          {isLoading ? (
            <Skeleton className="w-32 h-6" />
          ) : (
            <>
              {client && (
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusBadge(client.status)}`}>
                  {client.status} Client
                </span>
              )}
              <h2 className="font-heading font-bold text-xl text-text-primary tracking-tight mt-2.5 leading-none">{name}</h2>
              {client?.goal && <p className="text-[10px] text-text-muted font-bold mt-1">Goal: {client.goal}</p>}
            </>
          )}
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-5">
        {/* Quick actions: talk, call, follow-up */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {waHref ? (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="h-14 rounded-2xl bg-[#25D366] text-black font-bold text-sm flex items-center justify-center gap-1.5">
                <MessageCircle className="size-5" /> WhatsApp
              </a>
            ) : (
              <span className="h-14 rounded-2xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
            )}
            {phone ? (
              <a href={`tel:${phone}`} className="h-14 rounded-2xl bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                <Phone className="size-5" /> Call
              </a>
            ) : (
              <span className="h-14 rounded-2xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
            )}
            <button type="button" onClick={() => setFollowupOpen(true)} className="h-14 rounded-2xl bg-accent-orange text-black font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer">
              <CalendarPlus className="size-5" /> Follow-up
            </button>
          </div>
        )}

        {!isLoading && phone && (
          <button type="button" onClick={sendLoginLink} disabled={sendingLink} className="h-12 rounded-xl bg-white/5 border border-border-subtle text-text-primary font-semibold text-base cursor-pointer disabled:opacity-60">
            {sendingLink ? "Making link..." : "Send app login link on WhatsApp"}
          </button>
        )}

        {!isLoading && client && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditSheetOpen(true)}
              className="h-12 rounded-xl bg-accent-orange/15 border border-accent-orange/30 text-accent-orange font-semibold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <Edit className="size-4" /> Edit client
            </button>
            <button
              type="button"
              onClick={() => router.push(`/questionnaire?client=${id}`)}
              className="h-12 rounded-xl bg-white/5 border border-border-subtle text-text-primary font-semibold text-base flex items-center justify-center gap-1.5 cursor-pointer text-center px-2"
            >
              <FileText className="size-4 text-accent-orange" /> Fill questionnaire
            </button>
          </div>
        )}

        {/* Next follow-ups */}
        {!isLoading && followups.length > 0 && (
          <div className="rounded-2xl bg-bg-card border border-border-subtle p-4 space-y-2.5">
            <p className="text-sm text-text-muted">Next follow-ups</p>
            {followups.slice(0, 5).map((f) => {
              const fWa = waLink(phone ?? null, buildFollowupWaText(name, f.type, f.due_date, f.note))
              return (
                <div key={f.id} className="flex flex-col gap-1.5 text-base py-1.5 border-b border-border-subtle/50 last:border-none">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold">{format(new Date(f.due_date + "T00:00:00"), "d MMM")}</span>
                      <span className="text-text-muted"> · {FOLLOWUP_LABEL[f.type] ?? "Follow-up"}{f.note ? ` · ${f.note}` : ""}</span>
                    </div>
                    {fWa && (
                      <a
                        href={fWa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#25D366] text-black text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <MessageCircle className="size-3.5" /> Send on WhatsApp
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleEditFollowupNote(f.id, f.note)}
                      className="text-xs text-accent-orange font-semibold hover:underline cursor-pointer"
                    >
                      Edit note
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeFollowupDate(f.id, f.due_date)}
                      className="text-xs text-accent-orange font-semibold hover:underline cursor-pointer"
                    >
                      Change date
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFollowup(f.id)}
                      className="text-xs text-red-400 font-semibold hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex bg-bg-elevated p-1 rounded-full border border-border-subtle relative select-none">
          {tabs.map((t) => {
            const isSelected = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex-1 py-3 text-center text-[11px] font-heading font-bold uppercase tracking-normal rounded-full relative z-10 cursor-pointer"
              >
                {isSelected && (
                  <motion.div
                    layoutId="detail-active-tab"
                    className="absolute inset-0 bg-accent-orange rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className={`relative z-20 ${isSelected ? "text-bg-primary" : "text-text-muted"}`}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 space-y-3">
                  <h3 className="font-heading font-bold text-xs text-[#181310] uppercase tracking-wider border-b border-[#181310]/[0.08] pb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent-orange" />
                    Client Details
                  </h3>
                  {client && (
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Start Date</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">{format(new Date(client.start_date), "d MMM yy")}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Days Active</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">{daysActive}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Package</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">{client.package_name ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Fee</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">₹{Number(client.fee_amount).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#181310]/[0.08] pb-2">
                    <h3 className="font-heading font-bold text-xs text-[#181310] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent-orange" />
                      Questionnaires / Joining forms
                    </h3>
                    <button
                      type="button"
                      onClick={() => router.push(`/questionnaire?client=${id}`)}
                      className="text-xs font-bold text-accent-orange hover:underline cursor-pointer"
                    >
                      + Fill questionnaire
                    </button>
                  </div>
                  {joiningForms.length === 0 ? (
                    <p className="text-[#8A7F70] text-xs">No questionnaire attached yet. Tap &ldquo;Fill questionnaire&rdquo; to fill it yourself, or attach one below.</p>
                  ) : joiningForms.map((f) => (
                    <button key={f.id} type="button" onClick={() => router.push(`/submissions?open=${f.id}`)} className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-[#181310]/5 text-left cursor-pointer">
                      <span className="text-[#181310] text-sm font-semibold">{f.form_type === "antenatal_joining" ? "AN-PN Questionnaire" : "Lifestyle & Health Questionnaire"}</span>
                      <span className="text-accent-orange text-xs font-bold">{format(new Date(f.submitted_at), "d MMM yyyy")} · View →</span>
                    </button>
                  ))}
                  {unattachedForms.length > 0 && (
                    <div className="pt-2 border-t border-[#181310]/[0.08] space-y-1.5">
                      <p className="text-[11px] font-bold text-[#8A7F70] uppercase tracking-wider">Attach a filled questionnaire</p>
                      <div className="flex gap-2">
                        <select
                          value={selectedFormId}
                          onChange={(e) => setSelectedFormId(e.target.value)}
                          className="flex-1 min-w-0 h-10 rounded-xl bg-white border border-[#181310]/15 px-2.5 text-xs text-[#181310]"
                        >
                          <option value="">Choose filled form…</option>
                          {unattachedForms.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.senderName} ({format(new Date(u.submitted_at), "d MMM")})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedFormId || attachingForm}
                          onClick={handleAttachQuestionnaire}
                          className="px-4 h-10 rounded-xl bg-accent-orange text-bg-primary text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {attachingForm ? "Attaching…" : "Attach"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Client Badges & Achievements — stays dark, BadgesGrid is built for the dark theme */}
                <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4.5">
                  <BadgesGrid unlockedBadges={clientBadges} title="Client Achievements" showAll={true} />
                </div>

                {activeWorkout ? (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5">
                    <div className="flex items-center gap-2 mb-3">
                      <Dumbbell className="size-4 text-accent-orange" />
                      <span className="text-[#181310] text-xs font-bold uppercase tracking-wider">Current Workout Plan</span>
                    </div>
                    <p className="text-[#181310] font-heading font-bold">{activeWorkout.name}</p>
                    <p className="text-[#8A7F70] text-xs mt-1">{activeWorkout.weeks} weeks · Created {format(new Date(activeWorkout.created_at), "d MMM yyyy")}</p>
                  </div>
                ) : (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 text-center">
                    <p className="text-[#8A7F70] text-sm">No workout plan assigned</p>
                  </div>
                )}

                {activeNutrition && (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5">
                    <p className="text-[#181310] text-xs font-bold uppercase tracking-wider mb-3">Current Nutrition Plan</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Calories", value: activeNutrition.total_calories },
                        { label: "Protein", value: activeNutrition.protein_g },
                        { label: "Carbs", value: activeNutrition.carbs_g },
                        { label: "Fats", value: activeNutrition.fats_g },
                      ].map((m) => (
                        <div key={m.label} className="bg-[#181310]/5 rounded-xl p-2">
                          <p className="text-[#181310] text-sm font-heading font-bold">{m.value ?? "—"}</p>
                          <p className="text-[#8A7F70] text-[9px] mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Measurements progress table */}
                {checkins.some((c) => c.form_data?.measurements) && (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 space-y-3.5">
                    <h3 className="font-heading font-bold text-xs text-[#181310] uppercase tracking-wider border-b border-[#181310]/[0.08] pb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent-orange" />
                      Check-in Metrics
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold">
                        <thead>
                          <tr className="text-[9px] text-[#8A7F70] uppercase tracking-wider border-b border-[#181310]/[0.08]">
                            <th className="py-1">Date</th>
                            <th className="py-1">Weight</th>
                            <th className="py-1">Abdomen</th>
                            <th className="py-1">Hips</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#181310]/[0.08] text-[#181310] font-heading">
                          {[...checkins].reverse().map((c) => {
                            const m = c.form_data?.measurements
                            const abdomen = m?.abdomen ?? flatField(c, "w2_abdomen")
                            const hips = m?.hips ?? flatField(c, "w3_hips")
                            return (
                              <tr key={c.id}>
                                <td className="py-2.5 text-[#8A7F70]">{c.week_number ? `W${c.week_number}` : format(new Date(c.submitted_at), "d MMM")}</td>
                                <td className="py-2.5">{m?.weight ?? c.weight ?? "—"}{(m?.weight ?? c.weight) ? " kg" : ""}</td>
                                <td className="py-2.5">{abdomen ? `${abdomen} cm` : "—"}</td>
                                <td className="py-2.5">{hips ? `${hips} cm` : "—"}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "checkins" && (
              <div className="space-y-3">
                {checkins.length === 0 ? (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-10 text-center">
                    <p className="text-[#8A7F70] text-sm">No check-ins yet</p>
                  </div>
                ) : (
                  checkins.map((c) => {
                    const isExpanded = expandedCheckin === c.id
                    const avgScore =
                      [c.adherence_workout, c.adherence_nutrition].filter((v): v is number => v !== null).reduce((a, b, _, arr) => a + b / arr.length, 0) || null

                    return (
                      <div key={c.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setExpandedCheckin(isExpanded ? null : c.id)}
                          className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                        >
                          <div>
                            <p className="text-[#181310] text-sm font-bold">{c.week_number ? `Week ${c.week_number}` : "Check-in"}</p>
                            <p className="text-[#8A7F70] text-xs mt-0.5">{format(new Date(c.submitted_at), "d MMM yyyy, h:mm a")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.reviewed_at ? (
                              <span className="text-[9px] bg-accent-orange/15 border border-accent-orange/30 text-accent-orange px-2 py-0.5 rounded-full flex items-center gap-1 font-bold uppercase">
                                <Check className="size-3" /> Reviewed
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-accent-orange" />
                            )}
                            {avgScore !== null && <span className="text-xs text-[#8A7F70] font-bold">{Math.round(avgScore)}/10</span>}
                            {isExpanded ? <ChevronUp className="size-4 text-[#8A7F70]" /> : <ChevronDown className="size-4 text-[#8A7F70]" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-[#181310]/[0.08] pt-3">
                            {c.form_data ? (
                              <div className="space-y-2 text-xs">
                                <p className="text-[#8A7F70]"><span className="font-bold text-[#181310]">Workout deviation:</span> {c.form_data.training?.workout_deviation || flatField(c, "t3_workout_deviation") || "—"}</p>
                                <p className="text-[#8A7F70]"><span className="font-bold text-[#181310]">Diet:</span> {c.form_data.diet?.diet_deviation || flatField(c, "d1_diet_deviation") || "—"}</p>
                                <p className="text-[#8A7F70]"><span className="font-bold text-[#181310]">Sleep:</span> {c.form_data.general?.sleep_quality || flatField(c, "g2_sleep_quality") || "—"}</p>
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <ScoreBar label="Workout adherence" value={c.adherence_workout} />
                              <ScoreBar label="Nutrition adherence" value={c.adherence_nutrition} />
                            </div>
                            {(() => {
                              const bcaPath = bcaReportPath(c)
                              return (
                                <div className="bg-[#181310]/5 rounded-xl p-3">
                                  <p className="text-[#8A7F70] text-[10px] uppercase font-bold mb-1">BCA Report</p>
                                  {bcaPath ? (
                                    <button
                                      type="button"
                                      onClick={() => openCheckinFile(bcaPath)}
                                      className="text-accent-orange text-sm font-semibold underline cursor-pointer"
                                    >
                                      Open BCA report
                                    </button>
                                  ) : (
                                    <p className="text-[#8A7F70] text-sm">No BCA report</p>
                                  )}
                                </div>
                              )
                            })()}
                            {c.notes && (
                              <div className="bg-[#181310]/5 rounded-xl p-3">
                                <p className="text-[#8A7F70] text-[10px] uppercase font-bold mb-1">Client Note</p>
                                <p className="text-[#181310] text-sm">{c.notes}</p>
                              </div>
                            )}
                            {c.coach_feedback ? (
                              <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-3">
                                <p className="text-accent-orange text-[10px] uppercase font-bold mb-1">Your Feedback</p>
                                <p className="text-[#181310] text-sm">{c.coach_feedback}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  value={feedbackDraft[c.id] ?? ""}
                                  onChange={(e) => setFeedbackDraft((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  placeholder="Add your feedback..."
                                  rows={2}
                                  className="w-full bg-[#181310]/5 border border-[#181310]/[0.08] focus:border-accent-orange rounded-xl px-3 py-2 text-[#181310] text-xs font-semibold outline-none resize-none transition-colors"
                                />
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  disabled={!feedbackDraft[c.id]?.trim() || savingFeedback === c.id}
                                  onClick={() => handleSaveFeedback(c.id)}
                                  className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-accent-orange text-bg-primary text-xs font-bold disabled:opacity-50 cursor-pointer"
                                >
                                  <MessageSquare className="size-3" />
                                  {savingFeedback === c.id ? "Saving..." : "Add Feedback"}
                                </motion.button>
                              </div>
                            )}
                            <div className="pt-2 flex justify-end border-t border-[#181310]/[0.08]">
                              <button
                                type="button"
                                onClick={() => handleDeleteCheckin(c.id)}
                                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer py-1 px-2 rounded-lg hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="size-3.5" /> Delete check-in
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {activeTab === "plans" && (
              <div className="space-y-6">
                <SendPlanPanel clientId={id} clientName={name} phone={phone} showCycle={/contest prep/i.test(`${client?.package_name ?? ""} ${client?.goal ?? ""}`)} />
                <details className="rounded-2xl border border-border-subtle p-4">
                  <summary className="text-base font-semibold cursor-pointer">Plans built inside the app (advanced)</summary>
                  <div className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-text-muted text-xs font-bold mb-2 uppercase tracking-wider">Workout Plans</p>
                  {workoutPlans.length === 0 ? (
                    <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-6 text-center">
                      <p className="text-[#8A7F70] text-sm">No workout plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workoutPlans.map((p) => (
                        <div key={p.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[#181310] text-sm font-bold">{p.name}</p>
                            <p className="text-[#8A7F70] text-xs mt-0.5">{p.weeks} weeks · {format(new Date(p.created_at), "d MMM yyyy")}</p>
                          </div>
                          {p.is_active && <span className="text-[9px] bg-accent-orange/15 border border-accent-orange/30 text-accent-orange px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-text-muted text-xs font-bold mb-2 uppercase tracking-wider">Nutrition Plans</p>
                  {nutritionPlans.length === 0 ? (
                    <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-6 text-center">
                      <p className="text-[#8A7F70] text-sm">No nutrition plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nutritionPlans.map((p) => (
                        <div key={p.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[#181310] text-sm font-bold">{p.total_calories ? `${p.total_calories} kcal` : "Nutrition Plan"}</p>
                            <p className="text-[#8A7F70] text-xs mt-0.5">P {p.protein_g}g · C {p.carbs_g}g · F {p.fats_g}g</p>
                          </div>
                          {p.is_active && <span className="text-[9px] bg-accent-orange/15 border border-accent-orange/30 text-accent-orange px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push("/plans/builder")}
                  className="w-full h-12 rounded-full bg-bg-card/80 border border-border-subtle backdrop-blur-xl text-text-primary text-sm font-bold cursor-pointer"
                >
                  Assign New Plan
                </motion.button>
              </div>
                  </div>
                </details>
              </div>
            )}

            {activeTab === "fees" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  {fees.length > 0 && (
                    <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-3.5 flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[#8A7F70] text-xs font-semibold block">Total Paid</span>
                        <span className="text-accent-orange font-heading font-bold text-lg">₹{totalPaid.toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-[#8A7F70] text-xs font-semibold block">Balance Due</span>
                        <span className="text-[#181310] font-heading font-bold text-lg">₹{totalPending.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEditingFee(null); setPaymentModalOpen(true) }}
                    className="h-14 px-5 rounded-2xl bg-accent-orange text-black font-bold text-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="size-4" /> Add payment
                  </button>
                </div>

                {fees.length === 0 ? (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-10 text-center">
                    <p className="text-[#8A7F70] text-sm">No fee records yet</p>
                  </div>
                ) : (
                  fees.map((f) => {
                    const m = resolveFeeMetrics(f)
                    const waBill = waLink(phone ?? null, buildClientBillWaText(f))
                    return (
                      <div key={f.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[#181310] font-heading font-bold text-lg">
                              {f.status === "paid" ? `₹${m.amount.toLocaleString("en-IN")}` : `Due ₹${m.balanceDue.toLocaleString("en-IN")}`}
                            </p>
                            {m.pkgName && (
                              <p className="text-[#181310] text-xs font-semibold mt-0.5 truncate">{m.pkgName}</p>
                            )}
                            <p className="text-[#8A7F70] text-xs mt-0.5">
                              Invoice #{m.invNum} &middot; Due {format(new Date(f.due_date + "T00:00:00"), "d MMM yyyy")}
                            </p>
                            {f.paid_date && <p className="text-[#181310] text-xs mt-0.5 font-semibold">Paid {format(new Date(f.paid_date + "T00:00:00"), "d MMM yyyy")}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${feeStatusBadge(f.status)}`}>{f.status}</span>
                            {(f.status === "pending" || f.status === "overdue") && (
                              <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleMarkAsPaid(f.id)}
                                className="text-[10px] font-bold text-bg-primary bg-accent-orange px-2.5 py-1 rounded-full cursor-pointer"
                              >
                                Mark Paid
                              </motion.button>
                            )}
                          </div>
                        </div>

                        {/* Itemized Breakdown: Package Fee, Discount, Paid, Balance Due */}
                        <div className="mt-3 rounded-xl bg-[#181310]/[0.04] border border-[#181310]/[0.08] p-2.5 grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[#8A7F70] text-[10px] block">Package Fee</span>
                            <span className="text-[#181310] font-semibold">₹{m.packageFee.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[#8A7F70] text-[10px] block">Discount</span>
                            <span className="text-red-700 font-semibold">{m.discount > 0 ? `−₹${m.discount.toLocaleString("en-IN")}` : "₹0"}</span>
                          </div>
                          <div>
                            <span className="text-[#8A7F70] text-[10px] block">Paid</span>
                            <span className="text-emerald-700 font-semibold">₹{m.amountPaid.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-[#8A7F70] text-[10px] block">Balance Due</span>
                            <span className="text-[#181310] font-bold">₹{m.balanceDue.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        {f.notes && <p className="text-[#8A7F70] text-xs mt-2">{f.notes}</p>}

                        {/* Send bill on WhatsApp + Bill / receipt buttons (matching /fees) */}
                        <div className="flex items-center gap-2 mt-3">
                          {waBill && (
                            <a
                              href={waBill}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 h-9 px-3 rounded-xl bg-[#181310]/10 hover:bg-[#181310]/15 text-xs font-semibold text-[#181310] flex items-center justify-center gap-1.5"
                            >
                              <Send className="size-3.5 text-[#128C7E]" /> Send bill on WhatsApp
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDownloadClientReceipt(f)}
                            className="h-9 px-3 rounded-xl bg-[#181310]/10 hover:bg-[#181310]/15 text-xs font-semibold text-[#181310] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="size-3.5 text-accent-orange" /> Bill / receipt
                          </button>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#181310]/[0.08] flex items-center justify-end gap-2">
                          {(f.status === "paid" || m.amountPaid > 0) && (
                            <button
                              type="button"
                              onClick={() => handleUndoPaid(f.id)}
                              className="px-3 py-1 rounded-lg bg-[#181310]/5 text-[#181310] text-xs font-semibold hover:bg-[#181310]/10 cursor-pointer"
                            >
                              Undo payment
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setEditingFee(m.mapped); setPaymentModalOpen(true) }}
                            className="px-3 py-1 rounded-lg bg-[#181310]/5 text-[#181310] text-xs font-semibold hover:bg-[#181310]/10 cursor-pointer"
                          >
                            Edit bill
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFee(f.id)}
                            className="px-3 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
        </div>
      </div>

      {client && (
        <EditClientSheet
          isOpen={editSheetOpen}
          onClose={() => setEditSheetOpen(false)}
          client={client}
          onSuccess={fetchData}
          onDeleted={() => router.push("/clients")}
        />
      )}

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setEditingFee(null) }}
        mode={editingFee ? "edit" : "add"}
        clientId={id}
        initialFee={editingFee}
        onSuccess={fetchData}
      />

      {dateFor && (
        <ChangeDateSheet title="Move follow-up to" subtitle={name} current={dateFor.due} onSave={saveFollowupDate} onClose={() => setDateFor(null)} />
      )}
      {followupOpen && (
        <AddFollowupSheet
          isOpen
          onClose={() => setFollowupOpen(false)}
          clientId={id}
          clientName={name}
          clientPhone={phone}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}
