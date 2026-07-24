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
  goal: string
  packageName: string
  feeAmount: string
  feeDueDay: string
  startDate: string
  notes: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  goal?: string
  packageName?: string
  feeAmount?: string
  feeDueDay?: string
}

const GOALS = [
  "Fat Loss",
  "Muscle Building",
  "Contest Prep",
  "Maintenance",
  "Antenatal/Postnatal",
]

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

function isAntenatalPackage(packageName: string): boolean {
  return packageName.startsWith("Antenatal") || packageName.startsWith("Postpartum")
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

export default function AddClientModal({ isOpen, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    goal: "",
    packageName: "",
    feeAmount: "",
    feeDueDay: "1",
    startDate: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address"
    if (!form.goal) e.goal = "Select a goal"
    if (!PACKAGES.some((p) => p.name === form.packageName)) e.packageName = "Select a package"
    if (!form.feeAmount || Number(form.feeAmount) <= 0) e.feeAmount = "Enter a valid fee amount"
    const day = Number(form.feeDueDay)
    if (!day || day < 1 || day > 28) e.feeDueDay = "Enter a day between 1 and 28"
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
      const res = await fetch("/api/clients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() ? `+91${form.phone.replace(/\D/g, "")}` : null,
          goal: form.goal,
          packageName: form.packageName,
          endDate: computedEndDate,
          clientType: computedClientType,
          feeAmount: Number(form.feeAmount),
          feeDueDay: Number(form.feeDueDay),
          startDate: form.startDate,
          notes: form.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error?.includes("already registered") || res.status === 409) {
          toast.error("This email is already registered")
        } else {
          toast.error(data.error ?? "Failed to add client")
        }
        return
      }
      toast.success(`Client added! Password: ${data.password}`)
      setForm({
        name: "",
        email: "",
        phone: "",
        goal: "",
        packageName: "",
        feeAmount: "",
        feeDueDay: "1",
        startDate: new Date().toISOString().split("T")[0],
        notes: "",
      })
      setErrors({})
      onSuccess()
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#111111] rounded-t-3xl border border-[#222222] z-[60] max-h-[92vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1 rounded-full bg-[#333333]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <h2 className="text-white font-bold text-xl">Add New Client</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#A0A0A0] hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-5 pb-8 space-y-4"
            >
              {/* Full Name */}
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1.5 block">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Priya Sharma"
                  className={errors.name ? errorInputClass : inputClass}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1.5 block">
                  Email * <span className="text-[#555555]">(used for login)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="client@email.com"
                  className={errors.email ? errorInputClass : inputClass}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1.5 block">
                  Phone <span className="text-[#555555]">(optional)</span>
                </label>
                <div className="flex items-center bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 focus-within:border-[#C9A84C] transition-colors">
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
              </div>

              {/* Goal */}
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1.5 block">Goal *</label>
                <div className="relative">
                  <select
                    value={form.goal}
                    onChange={(e) => set("goal", e.target.value)}
                    className={cn(
                      "w-full appearance-none bg-[#1A1A1A] border rounded-2xl h-14 px-4 text-white outline-none transition-colors",
                      errors.goal
                        ? "border-red-500"
                        : "border-[#333333] focus:border-[#C9A84C]",
                      !form.goal && "text-[#555555]"
                    )}
                  >
                    <option value="" disabled>
                      Select Goal
                    </option>
                    {GOALS.map((g) => (
                      <option key={g} value={g} className="bg-[#1A1A1A] text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path d="M1 1l5 5 5-5" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                {errors.goal && (
                  <p className="text-red-400 text-xs mt-1">{errors.goal}</p>
                )}
              </div>

              {/* Package */}
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1.5 block">Package *</label>
                <div className="relative">
                  <select
                    value={form.packageName}
                    onChange={(e) => set("packageName", e.target.value)}
                    className={cn(
                      "w-full appearance-none bg-[#1A1A1A] border rounded-2xl h-14 px-4 text-white outline-none transition-colors",
                      errors.packageName
                        ? "border-red-500"
                        : "border-[#333333] focus:border-[#C9A84C]",
                      !form.packageName && "text-[#555555]"
                    )}
                  >
                    <option value="" disabled>
                      Select Package
                    </option>
                    {PACKAGES.map((p) => (
                      <option key={p.name} value={p.name} className="bg-[#1A1A1A] text-white">
                        {p.name} ({p.days} days)
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                      <path d="M1 1l5 5 5-5" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                {errors.packageName && (
                  <p className="text-red-400 text-xs mt-1">{errors.packageName}</p>
                )}
                {selectedPackage && (
                  <p className="text-[#C9A84C] text-xs mt-1.5">
                    Ends {computedEndDate} · {computedClientType === "antenatal" ? "Antenatal/Postpartum care" : "Standard"}
                  </p>
                )}
              </div>

              {/* Fee Amount + Due Day row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#A0A0A0] mb-1.5 block">Fee Amount *</label>
                  <div
                    className={cn(
                      "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 transition-colors",
                      errors.feeAmount
                        ? "border-red-500"
                        : "border-[#333333] focus-within:border-[#C9A84C]"
                    )}
                  >
                    <span className="text-[#C9A84C] font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.feeAmount}
                      onChange={(e) => set("feeAmount", e.target.value)}
                      placeholder="5000"
                      min="1"
                      className="flex-1 bg-transparent text-white outline-none placeholder:text-[#555555] ml-2"
                    />
                  </div>
                  {errors.feeAmount && (
                    <p className="text-red-400 text-xs mt-1">{errors.feeAmount}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#A0A0A0] mb-1.5 block">Fee Due Day *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.feeDueDay}
                    onChange={(e) => set("feeDueDay", e.target.value)}
                    placeholder="1"
                    min="1"
                    max="28"
                    className={errors.feeDueDay ? errorInputClass : inputClass}
                  />
                  {errors.feeDueDay && (
                    <p className="text-red-400 text-xs mt-1">{errors.feeDueDay}</p>
                  )}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1.5 block">Start Date *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  className={cn(inputClass, "text-white [color-scheme:dark]")}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-[#A0A0A0] mb-1.5 block">
                  Notes <span className="text-[#555555]">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any health conditions, preferences..."
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl px-4 py-3 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] resize-none"
                />
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.97 }}
                className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
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
