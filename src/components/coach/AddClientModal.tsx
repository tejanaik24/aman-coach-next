"use client"

import { useState, type FormEvent } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  name: string
  email: string
  phone: string
  packageName: string
  feeAmount: string
  feeCurrency: string
  startDate: string
  notes: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  packageName?: string
  feeAmount?: string
}

interface Package {
  name: string
  days: number
}

const PACKAGES: Package[] = [
  { name: "One Time On-Call Consult", days: 1 },
  { name: "Bodybuilding Contest Prep 12 Weeks", days: 84 },
  { name: "Bodybuilding Contest Prep 24 Weeks", days: 168 },
  { name: "Complete Online Coaching 12 Weeks", days: 84 },
  { name: "Complete Online Coaching 24 Weeks", days: 168 },
  { name: "Complete Online Coaching 1 Year", days: 365 },
  { name: "Only Nutrition/Diet 12 Weeks", days: 84 },
  { name: "Only Nutrition/Diet 24 Weeks", days: 168 },
  { name: "Bodybuilding Posing 4 Sessions", days: 30 },
  { name: "Bodybuilding Posing 8 Sessions", days: 60 },
  { name: "Antenatal-Postnatal Complete Care", days: 280 },
  { name: "Child Nutrition One Time", days: 3 },
  { name: "Child Nutrition 1 Month", days: 30 },
  { name: "Offline Training Camp", days: 30 },
  { name: "Postpartum Care 12 Weeks", days: 84 },
  { name: "Postpartum Care 24 Weeks", days: 168 },
]

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "AED", CAD: "CA$" }

function isAntenatalPackage(packageName: string): boolean {
  return packageName.startsWith("Antenatal") || packageName.startsWith("Postpartum")
}

// Goal is derived from the package so Aman never has to pick it.
function goalForPackage(packageName: string): string {
  if (packageName.includes("Contest Prep") || packageName.includes("Posing")) return "Contest Prep"
  if (isAntenatalPackage(packageName)) return "Antenatal/Postnatal"
  if (packageName.startsWith("Child Nutrition")) return "Child Nutrition"
  return "Lifestyle Coaching"
}

function calculateEndDate(startDate: string, days: number): string {
  const d = new Date(startDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

const inputClass =
  "w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555]"

const errorInputClass =
  "w-full bg-[#1A1A1A] border border-red-500 rounded-2xl h-14 px-4 text-white outline-none focus:border-red-500 transition-colors placeholder:text-[#555555]"

const emptyForm = (): FormData => ({
  name: "",
  email: "",
  phone: "",
  packageName: "",
  feeAmount: "",
  feeCurrency: "INR",
  startDate: new Date().toISOString().split("T")[0],
  notes: "",
})

export default function AddClientModal({ isOpen, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMore, setShowMore] = useState(false)

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (form.name.trim().length < 2) e.name = "Enter the client's name"
    if (form.phone.length !== 10) e.phone = "Enter the 10-digit WhatsApp number"
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email or leave it empty"
    if (!PACKAGES.some((p) => p.name === form.packageName)) e.packageName = "Pick a package"
    if (!form.feeAmount || Number(form.feeAmount) <= 0) e.feeAmount = "Enter the fee"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const selectedPackage = PACKAGES.find((p) => p.name === form.packageName) ?? null
  const computedEndDate = selectedPackage ? calculateEndDate(form.startDate, selectedPackage.days) : null
  const computedClientType = form.packageName ? (isAntenatalPackage(form.packageName) ? "antenatal" : "standard") : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      // First payment is due on the start date (day clamped to 1-28 for the monthly cycle).
      const dueDay = Math.min(28, Number(form.startDate.slice(8, 10)) || 1)
      const res = await fetch("/api/clients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: `+91${form.phone}`,
          goal: goalForPackage(form.packageName),
          packageName: form.packageName,
          endDate: computedEndDate,
          clientType: computedClientType,
          feeAmount: Number(form.feeAmount),
          feeCurrency: form.feeCurrency || "INR",
          feeDueDay: dueDay,
          startDate: form.startDate,
          notes: form.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add client")
        return
      }
      toast.success(`${form.name.trim()} added ✅`)
      setForm(emptyForm())
      setErrors({})
      setShowMore(false)
      onSuccess()
      onClose()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#111111] rounded-t-3xl border border-[#222222] z-[60] max-h-[92vh] flex flex-col"
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1 rounded-full bg-[#333333]" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <h2 className="text-white font-bold text-xl">Add New Client</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#A0A0A0] hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
              <div>
                <label className="text-sm text-[#A0A0A0] mb-1.5 block">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Priya Sharma"
                  className={errors.name ? errorInputClass : inputClass}
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="text-sm text-[#A0A0A0] mb-1.5 block">WhatsApp number</label>
                <div
                  className={cn(
                    "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 focus-within:border-[#C9A84C] transition-colors",
                    errors.phone ? "border-red-500" : "border-[#333333]"
                  )}
                >
                  <span className="text-[#C9A84C] font-semibold text-sm">+91</span>
                  <div className="w-px h-5 bg-[#333333] mx-3 flex-shrink-0" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 bg-transparent text-white outline-none placeholder:text-[#555555]"
                  />
                </div>
                {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="text-sm text-[#A0A0A0] mb-1.5 block">Package</label>
                <select
                  value={form.packageName}
                  onChange={(e) => set("packageName", e.target.value)}
                  className={cn(errors.packageName ? errorInputClass : inputClass, "appearance-none")}
                >
                  <option value="" className="bg-[#1A1A1A]">Pick a package</option>
                  {PACKAGES.map((p) => (
                    <option key={p.name} value={p.name} className="bg-[#1A1A1A]">{p.name}</option>
                  ))}
                </select>
                {errors.packageName && <p className="text-red-400 text-sm mt-1">{errors.packageName}</p>}
                {computedEndDate && <p className="text-[#888888] text-sm mt-1">Plan ends {computedEndDate}</p>}
              </div>

              <div>
                <label className="text-sm text-[#A0A0A0] mb-1.5 block">Fee</label>
                <div
                  className={cn(
                    "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 focus-within:border-[#C9A84C] transition-colors",
                    errors.feeAmount ? "border-red-500" : "border-[#333333]"
                  )}
                >
                  <span className="text-[#C9A84C] font-semibold">{CURRENCY_SYMBOL[form.feeCurrency] ?? "₹"}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.feeAmount}
                    onChange={(e) => set("feeAmount", e.target.value)}
                    placeholder="10000"
                    min="1"
                    className="flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-[#555555] ml-2"
                  />
                </div>
                {errors.feeAmount && <p className="text-red-400 text-sm mt-1">{errors.feeAmount}</p>}
              </div>

              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="text-[#C9A84C] text-sm font-semibold underline underline-offset-4 cursor-pointer"
              >
                {showMore ? "Hide details" : "More details (optional)"}
              </button>

              {showMore && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-[#A0A0A0] mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="client@email.com"
                      className={errors.email ? errorInputClass : inputClass}
                    />
                    {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm text-[#A0A0A0] mb-1.5 block">Currency</label>
                    <select
                      value={form.feeCurrency}
                      onChange={(e) => set("feeCurrency", e.target.value)}
                      className={cn(inputClass, "appearance-none")}
                    >
                      {Object.keys(CURRENCY_SYMBOL).map((c) => (
                        <option key={c} value={c} className="bg-[#1A1A1A]">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-[#A0A0A0] mb-1.5 block">Start date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => set("startDate", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#A0A0A0] mb-1.5 block">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder="Any health conditions, preferences..."
                      rows={3}
                      className="w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl px-4 py-3 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] resize-none"
                    />
                  </div>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.97 }}
                className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  "Add Client"
                )}
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
