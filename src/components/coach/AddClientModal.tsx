"use client"

import { PACKAGES, calculateEndDate, goalForPackage, isAntenatalPackage, type Package } from "@/lib/package-goal"
import { validateBillInput, computeBillPreview } from "@/lib/bill-validation"

import { useState, useEffect, type FormEvent } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { COUNTRIES, phoneDigitRange } from "@/lib/country-codes"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  name: string
  email: string
  countryCode: string
  phone: string
  packageName: string
  feeAmount: string
  discountValue: string
  discountMode: "INR" | "PCT"
  amountPaid: string
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
  discountValue?: string
  amountPaid?: string
}

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "AED", CAD: "CA$" }

// Shared package list and helpers live in src/lib/package-goal.ts.
export { PACKAGES, calculateEndDate, isAntenatalPackage, goalForPackage, type Package }

const inputClass =
  "w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555]"

const errorInputClass =
  "w-full bg-[#1A1A1A] border border-red-500 rounded-2xl h-14 px-4 text-white outline-none focus:border-red-500 transition-colors placeholder:text-[#555555]"

const emptyForm = (): FormData => ({
  name: "",
  email: "",
  countryCode: "+91",
  phone: "",
  packageName: "",
  feeAmount: "",
  discountValue: "",
  discountMode: "INR",
  amountPaid: "0",
  feeCurrency: "INR",
  startDate: new Date().toISOString().split("T")[0],
  notes: "",
})

export default function AddClientModal({ isOpen, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [packageFeeMap, setPackageFeeMap] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    supabase
      .from("package_fees")
      .select("package_name, fee_amount")
      .then(({ data }: { data: { package_name: string; fee_amount: number }[] | null }) => {
        if (data) {
          const map: Record<string, number> = {}
          for (const row of data) {
            if (Number(row.fee_amount) > 0) map[row.package_name] = Number(row.fee_amount)
          }
          setPackageFeeMap(map)
        }
      })
  }, [isOpen])

  function set(field: keyof FormData, value: string) {
    const next = { ...form, [field]: value }
    if (field === "packageName" && value && packageFeeMap[value] !== undefined) {
      next.feeAmount = String(packageFeeMap[value])
    }
    setForm(next)

    if (field === "feeAmount" || field === "discountValue" || field === "discountMode" || field === "amountPaid" || field === "packageName") {
      const billCheck = validateBillInput({
        packageFee: next.feeAmount,
        discountValue: next.discountValue,
        discountMode: next.discountMode,
        amountPaid: next.amountPaid,
      })
      setErrors((prev) => ({
        ...prev,
        ...(field === "packageName" ? { packageName: undefined } : {}),
        feeAmount: billCheck.errors.packageFee,
        discountValue: billCheck.errors.discountValue,
        amountPaid: billCheck.errors.amountPaid,
      }))
    } else if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const preview = computeBillPreview({
    packageFee: form.feeAmount,
    discountValue: form.discountValue,
    discountMode: form.discountMode,
    amountPaid: form.amountPaid,
  })
  const basePkgFee = preview.packageFee
  const discountRupees = preview.discountRupees
  const finalPayable = preview.finalAmount

  function validate(): boolean {
    const e: FormErrors = {}
    if (form.name.trim().length < 2) e.name = "Enter the client's name"
    const range = phoneDigitRange(form.countryCode)
    if (form.phone.length < range.min || form.phone.length > range.max) {
      e.phone = range.min === range.max ? `Enter the ${range.min}-digit WhatsApp number` : "Enter the WhatsApp number without the country code"
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email or leave it empty"
    if (!PACKAGES.some((p) => p.name === form.packageName)) e.packageName = "Pick a package"

    const billValidation = validateBillInput({
      packageFee: form.feeAmount,
      discountValue: form.discountValue,
      discountMode: form.discountMode,
      amountPaid: form.amountPaid,
    })
    if (billValidation.errors.packageFee) e.feeAmount = billValidation.errors.packageFee
    if (billValidation.errors.discountValue) e.discountValue = billValidation.errors.discountValue
    if (billValidation.errors.amountPaid) e.amountPaid = billValidation.errors.amountPaid
    if (!e.feeAmount && billValidation.errors.general) e.feeAmount = billValidation.errors.general

    setErrors(e)
    if (billValidation.firstError) {
      toast.error(billValidation.firstError)
    }
    return Object.keys(e).length === 0
  }

  const selectedPackage = PACKAGES.find((p) => p.name === form.packageName) ?? null
  const computedEndDate = selectedPackage ? calculateEndDate(form.startDate, selectedPackage.days) : null
  const computedClientType = form.packageName ? (isAntenatalPackage(form.packageName) ? "antenatal" : "standard") : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const billValidation = validateBillInput({
      packageFee: form.feeAmount,
      discountValue: form.discountValue,
      discountMode: form.discountMode,
      amountPaid: form.amountPaid,
    })
    if (!billValidation.valid) return

    setIsSubmitting(true)
    try {
      const dueDay = Math.min(28, Number(form.startDate.slice(8, 10)) || 1)
      const res = await fetch("/api/clients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: `${form.countryCode.replace(/\D/g, "")}${form.phone.replace(/\D/g, "")}`,
          goal: goalForPackage(form.packageName),
          packageName: form.packageName,
          endDate: computedEndDate,
          clientType: computedClientType,
          packageFee: billValidation.values.packageFee,
          discount: billValidation.values.discountRupees,
          discountValue: form.discountValue,
          discountMode: form.discountMode,
          amountPaid: billValidation.values.amountPaid,
          feeAmount: billValidation.values.finalAmount,
          feeCurrency: form.feeCurrency || "INR",
          feeDueDay: dueDay,
          startDate: form.startDate,
          dueDate: form.startDate,
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
                  <select
                    aria-label="Country code"
                    value={form.countryCode}
                    onChange={(e) => set("countryCode", e.target.value)}
                    className="bg-transparent text-[#C9A84C] font-semibold text-sm outline-none cursor-pointer max-w-[6.5rem] shrink-0"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.name} value={c.dial} className="bg-[#1A1A1A] text-white">
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>
                  <div className="w-px h-5 bg-[#333333] mx-3 flex-shrink-0" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, phoneDigitRange(form.countryCode).max))}
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
                    <option key={p.name} value={p.name} className="bg-[#1A1A1A]">
                      {p.name}{packageFeeMap[p.name] ? ` — ₹${packageFeeMap[p.name].toLocaleString("en-IN")}` : ""}
                    </option>
                  ))}
                </select>
                {errors.packageName && <p className="text-red-400 text-sm mt-1">{errors.packageName}</p>}
                {computedEndDate && <p className="text-[#888888] text-sm mt-1">Plan ends {computedEndDate}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#A0A0A0] mb-1.5 block">Package Fee</label>
                  <div
                    className={cn(
                      "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 focus-within:border-[#C9A84C] transition-colors",
                      errors.feeAmount ? "border-red-500" : "border-[#333333]"
                    )}
                  >
                    <span className="text-[#C9A84C] font-semibold">{CURRENCY_SYMBOL[form.feeCurrency] ?? "₹"}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.feeAmount}
                      onChange={(e) => set("feeAmount", e.target.value)}
                      placeholder="10000"
                      className="flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-[#555555] ml-2"
                    />
                  </div>
                  {errors.feeAmount && <p className="text-red-400 text-xs mt-1">{errors.feeAmount}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm text-[#A0A0A0]">Discount</label>
                    <div className="flex rounded-lg bg-[#1A1A1A] border border-[#333333] p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => set("discountMode", "INR")}
                        className={cn("px-2 py-0.5 rounded-md font-bold cursor-pointer", form.discountMode === "INR" ? "bg-[#C9A84C] text-black" : "text-[#A0A0A0]")}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => set("discountMode", "PCT")}
                        className={cn("px-2 py-0.5 rounded-md font-bold cursor-pointer", form.discountMode === "PCT" ? "bg-[#C9A84C] text-black" : "text-[#A0A0A0]")}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 focus-within:border-[#C9A84C] transition-colors",
                      errors.discountValue ? "border-red-500" : "border-[#333333]"
                    )}
                  >
                    <span className="text-[#C9A84C] font-semibold">{form.discountMode === "PCT" ? "%" : (CURRENCY_SYMBOL[form.feeCurrency] ?? "₹")}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.discountValue}
                      onChange={(e) => set("discountValue", e.target.value)}
                      placeholder="0"
                      className="flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-[#555555] ml-2"
                    />
                  </div>
                  {errors.discountValue && <p className="text-red-400 text-xs mt-1">{errors.discountValue}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm text-[#A0A0A0] mb-1.5 block">Amount Paid So Far</label>
                <div
                  className={cn(
                    "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 focus-within:border-[#C9A84C] transition-colors",
                    errors.amountPaid ? "border-red-500" : "border-[#333333]"
                  )}
                >
                  <span className="text-[#C9A84C] font-semibold">{CURRENCY_SYMBOL[form.feeCurrency] ?? "₹"}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.amountPaid}
                    onChange={(e) => set("amountPaid", e.target.value)}
                    placeholder="0"
                    className="flex-1 min-w-0 bg-transparent text-white outline-none placeholder:text-[#555555] ml-2"
                  />
                </div>
                {errors.amountPaid && <p className="text-red-400 text-xs mt-1">{errors.amountPaid}</p>}
              </div>

              <div className="rounded-xl bg-[#1A1A1A] border border-[#333333] px-4 py-2.5 space-y-1 text-xs text-[#A0A0A0]">
                <div className="flex items-center justify-between">
                  <span>Package Fee</span>
                  <span className="text-white font-semibold">₹{basePkgFee.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Discount{form.discountMode === "PCT" ? ` (${preview.discountValue}%)` : ""}</span>
                  <span className="font-semibold">− ₹{discountRupees.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#333333] pt-1">
                  <span className="text-white font-semibold">Final Bill</span>
                  <span className="text-[#C9A84C] font-bold text-sm">₹{finalPayable.toLocaleString("en-IN")}</span>
                </div>
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
