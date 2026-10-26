"use client"

import { useState, type FormEvent } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Trash2, PauseCircle, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { PACKAGES, calculateEndDate } from "@/lib/package-goal"
import type { ClientWithProfile } from "@/types"

interface Props {
  isOpen: boolean
  onClose: () => void
  client: ClientWithProfile
  onSuccess: () => void
  onDeleted: () => void
}

const inputClass =
  "w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] text-base"

type ClientStatus = "active" | "paused" | "inactive"

const STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  paused: "Paused",
  inactive: "Stopped",
}

export default function EditClientSheet({ isOpen, onClose, client, onSuccess, onDeleted }: Props) {
  const [name, setName] = useState(client.profile?.name ?? "")
  const [phone, setPhone] = useState(client.profile?.phone ?? "")
  const [packageName, setPackageName] = useState(client.package_name ?? "")
  const [feeAmount, setFeeAmount] = useState(String(client.fee_amount ?? ""))
  const [feeDueDay, setFeeDueDay] = useState(String(client.fee_due_day ?? "1"))
  const [startDate, setStartDate] = useState(client.start_date ?? new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(client.end_date ?? "")
  const [notes, setNotes] = useState(client.notes ?? "")
  const [status, setStatus] = useState<ClientStatus>(client.status ?? "active")
  const [emiAllowed, setEmiAllowed] = useState(client.emi_allowed ?? false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInputName, setDeleteInputName] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handlePackageChange = (pkgName: string) => {
    setPackageName(pkgName)
    const pkg = PACKAGES.find((p) => p.name === pkgName)
    if (pkg && startDate) {
      setEndDate(calculateEndDate(startDate, pkg.days))
    }
  }

  const handleStartDateChange = (val: string) => {
    setStartDate(val)
    const pkg = PACKAGES.find((p) => p.name === packageName)
    if (pkg && val) {
      setEndDate(calculateEndDate(val, pkg.days))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error("Client name is required"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/coach/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          package_name: packageName,
          fee_amount: feeAmount ? Number(feeAmount) : 0,
          fee_due_day: Number(feeDueDay) || 1,
          start_date: startDate,
          end_date: endDate || null,
          notes: notes.trim(),
          status,
          emi_allowed: emiAllowed,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Could not update client")
        return
      }
      toast.success("Client updated")
      onSuccess()
      onClose()
    } catch {
      toast.error("Could not update client")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStopClient = async () => {
    if (!window.confirm(`Stop coaching for ${client.profile?.name ?? "this client"}? They will be marked as Stopped and will no longer receive reminders, but all history is kept.`)) {
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/coach/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Could not stop client")
        return
      }
      toast.success("Client stopped")
      setStatus("inactive")
      onSuccess()
      onClose()
    } catch {
      toast.error("Could not stop client")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteForever = async () => {
    const expectedName = (client.profile?.name ?? "").trim()
    if (deleteInputName.trim().toLowerCase() !== expectedName.toLowerCase()) {
      toast.error("Typed name does not match")
      return
    }
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/coach/clients/${client.id}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Could not delete client")
        return
      }
      toast.success("Client deleted forever")
      onDeleted()
    } catch {
      toast.error("Could not delete client")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="w-full max-w-lg max-h-[90vh] bg-[#111111] border border-[#222222] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#222222] shrink-0">
            <div>
              <h2 className="text-xl font-bold font-heading">Edit Client</h2>
              <p className="text-xs text-text-muted mt-0.5">{client.profile?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            <form id="edit-client-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Phone (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 919815690656"
                  className={inputClass}
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Digits only. If changed, client login will sync automatically.
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "paused", "inactive"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`h-12 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border transition-colors ${
                        status === s
                          ? s === "active"
                            ? "bg-accent-orange text-black border-accent-orange"
                            : s === "paused"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              : "bg-red-500/20 text-red-400 border-red-500/50"
                          : "bg-[#1A1A1A] border-[#333333] text-text-muted"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Package */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Package
                </label>
                <select
                  value={packageName}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className={`${inputClass} bg-[#1A1A1A]`}
                >
                  <option value="">Select package…</option>
                  {packageName && !PACKAGES.some((p) => p.name === packageName) && (
                    <option value={packageName}>{packageName}</option>
                  )}
                  {PACKAGES.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fee */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Package Fee (₹)
                </label>
                <input
                  type="number"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className={inputClass}
                />
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Coach Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Private notes about goals, medical history, etc."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl p-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] text-base resize-none"
                />
              </div>
            </form>

            {/* Stop client action */}
            {status !== "inactive" && (
              <div className="pt-2 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={handleStopClient}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <PauseCircle className="w-4 h-4 text-yellow-400" /> Stop Client (keep history)
                </button>
              </div>
            )}

            {/* Delete forever section */}
            <div className="pt-2 border-t border-[#222222]">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Forever
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 space-y-3">
                  <p className="text-xs text-red-300 font-medium">
                    This permanently deletes this client, check-ins, forms, photos, and login. Type{" "}
                    <strong className="text-white underline">{client.profile?.name}</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteInputName}
                    onChange={(e) => setDeleteInputName(e.target.value)}
                    placeholder="Type client's name"
                    className="w-full bg-[#1A1A1A] border border-red-500/50 rounded-xl h-11 px-3 text-white text-sm outline-none focus:border-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteInputName("")
                      }}
                      className="flex-1 h-10 rounded-xl bg-white/10 text-xs font-semibold text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteForever}
                      disabled={isDeleting || deleteInputName.trim().toLowerCase() !== (client.profile?.name ?? "").trim().toLowerCase()}
                      className="flex-1 h-10 rounded-xl bg-red-600 text-xs font-bold text-white cursor-pointer disabled:opacity-40"
                    >
                      {isDeleting ? "Deleting…" : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="p-5 border-t border-[#222222] bg-[#0E0E0E] shrink-0">
            <button
              type="submit"
              form="edit-client-form"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
