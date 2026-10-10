"use client"

import { useState, type FormEvent, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

interface Props {
  isOpen: boolean
  onClose: () => void
  mode: "add" | "edit"
  clientId?: string
  clientOptions?: { id: string; name: string }[]
  initialFee?: {
    id: string
    clientId?: string
    amount: number
    dueDate?: string
    due_date?: string
    notes?: string | null
    status?: string
    paidDate?: string | null
    paid_date?: string | null
  } | null
  onSuccess: () => void
}

const inputClass =
  "w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] text-base"

export default function PaymentModal({
  isOpen,
  onClose,
  mode,
  clientId,
  clientOptions = [],
  initialFee,
  onSuccess,
}: Props) {
  const [selectedClientId, setSelectedClientId] = useState(clientId || initialFee?.clientId || "")
  const [amount, setAmount] = useState(initialFee ? String(initialFee.amount) : "")
  const [dueDate, setDueDate] = useState(
    initialFee?.dueDate || initialFee?.due_date || new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = useState(initialFee?.notes || "")
  const [status, setStatus] = useState(initialFee?.status || "pending")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialFee) {
      setAmount(String(initialFee.amount))
      setDueDate(initialFee.dueDate || initialFee.due_date || new Date().toISOString().split("T")[0])
      setNotes(initialFee.notes || "")
      setStatus(initialFee.status || "pending")
      if (initialFee.clientId) setSelectedClientId(initialFee.clientId)
    } else {
      setAmount("")
      setDueDate(new Date().toISOString().split("T")[0])
      setNotes("")
      setStatus("pending")
      if (clientId) setSelectedClientId(clientId)
    }
  }, [initialFee, clientId, isOpen])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const targetClientId = clientId || selectedClientId
    if (!targetClientId) {
      toast.error("Please select a client")
      return
    }
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    if (!dueDate) {
      toast.error("Please choose a due date")
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      if (mode === "add") {
        const today = new Date().toISOString().split("T")[0]
        const { error } = await supabase.from("fees").insert({
          client_id: targetClientId,
          amount: numAmount,
          currency: "INR",
          due_date: dueDate,
          notes: notes.trim() || null,
          status,
          paid_date: status === "paid" ? today : null,
        })
        if (error) {
          toast.error("Could not add payment: " + error.message)
          return
        }
        toast.success("Payment added")
      } else if (mode === "edit" && initialFee) {
        const { error } = await supabase
          .from("fees")
          .update({
            amount: numAmount,
            due_date: dueDate,
            notes: notes.trim() || null,
          })
          .eq("id", initialFee.id)
        if (error) {
          toast.error("Could not update payment: " + error.message)
          return
        }
        toast.success("Payment updated")
      }
      onSuccess()
      onClose()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
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
          className="w-full max-w-md bg-[#111111] border border-[#222222] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#222222]">
            <h2 className="text-xl font-bold font-heading">
              {mode === "add" ? "Add Payment" : "Edit Payment"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {!clientId && clientOptions.length > 0 && mode === "add" && (
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Client
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={`${inputClass} bg-[#1A1A1A]`}
                  required
                >
                  <option value="">Select client…</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15000"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {mode === "add" && (
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("pending")}
                    className={`h-12 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border ${
                      status === "pending"
                        ? "bg-accent-orange text-black border-accent-orange"
                        : "bg-[#1A1A1A] border-[#333333] text-text-muted"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("paid")}
                    className={`h-12 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border ${
                      status === "paid"
                        ? "bg-accent-orange text-black border-accent-orange"
                        : "bg-[#1A1A1A] border-[#333333] text-text-muted"
                    }`}
                  >
                    Paid
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional payment notes"
                className={inputClass}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isSubmitting ? "Saving…" : mode === "add" ? "Create Payment" : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

