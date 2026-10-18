"use client"

import { useState, type FormEvent, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { paidSoFar } from "@/lib/fee-math"
import { validateBillInput, computeBillPreview, type BillFieldErrors, type DiscountMode } from "@/lib/bill-validation"
import { PACKAGES, calculateEndDate } from "@/lib/package-goal"

interface ClientOption {
  id: string
  name: string
  packageName?: string | null
  startDate?: string | null
  endDate?: string | null
  feeAmount?: number | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  mode: "add" | "edit"
  clientId?: string
  clientOptions?: ClientOption[]
  initialFee?: {
    id: string
    clientId?: string
    client_id?: string
    packageFee?: number | null
    package_fee?: number | null
    discount?: number | null
    otherCharges?: number | null
    other_charges?: number | null
    rewardPointsRedeemed?: number | null
    reward_points_redeemed?: number | null
    amountPaid?: number | null
    amount_paid?: number | null
    amount: number
    dueDate?: string
    due_date?: string
    packageName?: string | null
    package_name?: string | null
    startDate?: string | null
    endDate?: string | null
    notes?: string | null
    status?: string
    paidDate?: string | null
    paid_date?: string | null
  } | null
  onSuccess: () => void
}

interface ClientSnapshot {
  packageName: string | null
  startDate: string | null
  endDate: string | null
  feeAmount: number | null
  emiAllowed: boolean
}

const inputClass =
  "w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl h-12 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] text-sm"

const readOnlyInputClass =
  "w-full bg-[#141414] border border-[#262626] rounded-2xl h-12 px-4 text-[#888888] outline-none opacity-65 cursor-not-allowed text-sm"

const errorInputClass =
  "w-full bg-[#1A1A1A] border border-red-500 rounded-2xl h-12 px-4 text-white outline-none focus:border-red-500 transition-colors placeholder:text-[#555555] text-sm"

export default function PaymentModal({
  isOpen,
  onClose,
  mode,
  clientId,
  clientOptions = [],
  initialFee,
  onSuccess,
}: Props) {
  const [selectedClientId, setSelectedClientId] = useState(clientId || initialFee?.clientId || initialFee?.client_id || "")
  const [packageName, setPackageName] = useState(initialFee?.packageName || initialFee?.package_name || "")
  const [startDate, setStartDate] = useState(initialFee?.startDate || "")
  const [endDate, setEndDate] = useState(initialFee?.endDate || "")
  const [packageFee, setPackageFee] = useState("")
  const [discountValue, setDiscountValue] = useState("0")
  const [discountMode, setDiscountMode] = useState<DiscountMode>("INR")
  const [otherChargesStr, setOtherChargesStr] = useState("0")
  const [amountPaidStr, setAmountPaidStr] = useState("0")
  const [dueDate, setDueDate] = useState(
    initialFee?.dueDate || initialFee?.due_date || new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = useState(initialFee?.notes || "")
  const [status, setStatus] = useState(initialFee?.status || "pending")
  const [alsoUpdateClient, setAlsoUpdateClient] = useState(mode === "add")
  const [currentClientSnapshot, setCurrentClientSnapshot] = useState<ClientSnapshot | null>(null)
  const [isEmi, setIsEmi] = useState(false)
  const [emiParts, setEmiParts] = useState<2 | 3 | 4>(3)
  const [fieldErrors, setFieldErrors] = useState<BillFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  useEffect(() => {
    if (!isOpen) return
    setFieldErrors({})
    if (initialFee) {
      const initDisc = Number(initialFee.discount ?? 0)
      const initOther = Number(initialFee.otherCharges ?? initialFee.other_charges ?? 0)
      const initReward = Number(initialFee.rewardPointsRedeemed ?? initialFee.reward_points_redeemed ?? 0)
      const rawPkg = initialFee.packageFee ?? initialFee.package_fee
      const initPkgFee =
        rawPkg !== undefined && rawPkg !== null && Number(rawPkg) > 0
          ? Number(rawPkg)
          : Number(initialFee.amount) + initDisc - initOther + initReward
      setPackageFee(String(initPkgFee))
      setDiscountMode("INR")
      setDiscountValue(String(initDisc))
      setOtherChargesStr(String(initOther))
      setAmountPaidStr(String(paidSoFar(initialFee)))
      setDueDate(initialFee.dueDate || initialFee.due_date || "")
      setNotes(initialFee.notes || "")
      setStatus(initialFee.status || "pending")
      setPackageName(initialFee.packageName || initialFee.package_name || "")
      // Never fall back to today's date when editing an old bill with no stored start date
      setStartDate(initialFee.startDate || "")
      setEndDate(initialFee.endDate || "")
      setAlsoUpdateClient(false)
      setCurrentClientSnapshot((prev) =>
        prev ?? {
          packageName: initialFee.packageName || initialFee.package_name || null,
          startDate: initialFee.startDate || null,
          endDate: initialFee.endDate || null,
          feeAmount: Number(initialFee.amount) || null,
          emiAllowed: false,
        }
      )
      const cId = initialFee.clientId || initialFee.client_id || clientId
      if (cId) setSelectedClientId(cId)
    } else {
      const today = new Date().toISOString().split("T")[0]
      setPackageFee("")
      setDiscountMode("INR")
      setDiscountValue("0")
      setOtherChargesStr("0")
      setAmountPaidStr("0")
      setDueDate(today)
      setNotes("")
      setStatus("pending")
      setStartDate(today)
      setEndDate("")
      setPackageName("")
      setAlsoUpdateClient(true)
      if (clientId) setSelectedClientId(clientId)
    }
  }, [initialFee, clientId, isOpen])

  // Fetch the client's current profile row so we can show what will change (and auto-fill in add/edit mode)
  useEffect(() => {
    if (!isOpen) return
    const targetId = clientId || selectedClientId || initialFee?.clientId || initialFee?.client_id
    if (!targetId) {
      setCurrentClientSnapshot(null)
      return
    }
    const supabase = createClient()
    supabase
      .from("clients")
      .select("package_name, start_date, end_date, fee_amount, emi_allowed")
      .eq("id", targetId)
      .maybeSingle()
      .then(
        ({
          data,
        }: {
          data: {
            package_name?: string | null
            start_date?: string | null
            end_date?: string | null
            fee_amount?: number | null
            emi_allowed?: boolean | null
          } | null
        }) => {
          if (data) {
            setCurrentClientSnapshot({
              packageName: data.package_name ?? null,
              startDate: data.start_date ?? null,
              endDate: data.end_date ?? null,
              feeAmount: data.fee_amount ?? null,
              emiAllowed: Boolean(data.emi_allowed),
            })
            if (mode === "add" && !packageName && data.package_name) {
              const pkg = data.package_name
              setPackageName(pkg)
              if (data.start_date) setStartDate(data.start_date)
              if (data.end_date) setEndDate(data.end_date)
              const presetFee = packageFeeMap[pkg] ?? Number(data.fee_amount || 0)
              if (presetFee > 0) setPackageFee(String(presetFee))
            } else if (mode === "edit") {
              setPackageName((prev) => prev || data.package_name || "")
              setStartDate((prev) => prev || data.start_date || "")
              setEndDate((prev) => prev || data.end_date || "")
            }
          }
        }
      )
  }, [selectedClientId, clientId, initialFee, isOpen, mode, packageFeeMap])

  const rewardPoints = Number(initialFee?.rewardPointsRedeemed ?? initialFee?.reward_points_redeemed ?? 0)

  function recomputeErrors(next: {
    packageFee?: string
    discountValue?: string
    discountMode?: DiscountMode
    otherChargesStr?: string
    amountPaidStr?: string
  }) {
    const res = validateBillInput({
      packageFee: next.packageFee ?? packageFee,
      discountValue: next.discountValue ?? discountValue,
      discountMode: next.discountMode ?? discountMode,
      otherCharges: next.otherChargesStr ?? otherChargesStr,
      rewardPointsRedeemed: rewardPoints,
      amountPaid: next.amountPaidStr ?? amountPaidStr,
    })
    setFieldErrors(res.errors)
  }

  function handlePackageChange(nextPkg: string, baseStart = startDate) {
    setPackageName(nextPkg)
    const found = PACKAGES.find((p) => p.name === nextPkg)
    if (found && baseStart) {
      setEndDate(calculateEndDate(baseStart, found.days))
    }
    if (nextPkg && packageFeeMap[nextPkg] !== undefined) {
      const nextFeeStr = String(packageFeeMap[nextPkg])
      setPackageFee(nextFeeStr)
      recomputeErrors({ packageFee: nextFeeStr })
    }
  }

  function handleStartDateChange(nextStart: string) {
    setStartDate(nextStart)
    const found = PACKAGES.find((p) => p.name === packageName)
    if (found && nextStart) {
      setEndDate(calculateEndDate(nextStart, found.days))
    }
  }

  const preview = computeBillPreview({
    packageFee,
    discountValue,
    discountMode,
    otherCharges: otherChargesStr,
    rewardPointsRedeemed: rewardPoints,
    amountPaid: amountPaidStr,
  })
  const numPackageFee = preview.packageFee
  const discountRupees = preview.discountRupees
  const numOtherCharges = preview.otherCharges
  const finalAmount = preview.finalAmount

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const targetClientId = clientId || selectedClientId
    if (!targetClientId) {
      toast.error("Please select a client")
      return
    }

    const validation = validateBillInput({
      packageFee,
      discountValue,
      discountMode,
      otherCharges: otherChargesStr,
      rewardPointsRedeemed: rewardPoints,
      amountPaid: amountPaidStr,
    })
    setFieldErrors(validation.errors)
    if (!validation.valid) {
      toast.error(validation.firstError || "Please check the bill amounts.")
      return
    }

    if (!dueDate) {
      toast.error("Please choose a due date")
      return
    }

    const validPkgFee = validation.values.packageFee
    const validDiscountRupees = validation.values.discountRupees
    const validOtherCharges = validation.values.otherCharges
    const validFinalAmount = validation.values.finalAmount
    const validAmountPaid = validation.values.amountPaid

    const today = new Date().toISOString().split("T")[0]
    const resolvedAmountPaid =
      mode === "add" && status === "paid" && validAmountPaid === 0
        ? validFinalAmount
        : validAmountPaid

    const resolvedStatus: "paid" | "pending" =
      validFinalAmount > 0 && resolvedAmountPaid >= validFinalAmount ? "paid" : "pending"
    const existingPaidDate = initialFee?.paidDate ?? initialFee?.paid_date ?? null
    const resolvedPaidDate = resolvedStatus === "paid" ? (existingPaidDate || today) : null

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      // Only update the client's current package/dates/fee when alsoUpdateClient is ticked
      if (alsoUpdateClient && packageName) {
        await supabase
          .from("clients")
          .update({
            package_name: packageName,
            start_date: startDate || null,
            end_date: endDate || null,
            fee_amount: validFinalAmount,
          })
          .eq("id", targetClientId)
      }

      if (mode === "add") {
        if (isEmi && currentClientSnapshot?.emiAllowed) {
          const emiGroupId = crypto.randomUUID()
          const partCount = emiParts
          const basePartAmount = Math.floor(validFinalAmount / partCount)
          const remainder = validFinalAmount - basePartAmount * partCount

          const rowsToInsert = []
          for (let i = 1; i <= partCount; i++) {
            // Due date: monthly intervals
            const partDueDateObj = new Date(dueDate + "T00:00:00")
            partDueDateObj.setMonth(partDueDateObj.getMonth() + (i - 1))
            const partDueDate = format(partDueDateObj, "yyyy-MM-dd")

            // Last instalment gets the rounding remainder
            const partAmount = i === partCount ? basePartAmount + remainder : basePartAmount

            rowsToInsert.push({
              client_id: targetClientId,
              package_fee: Math.round(validPkgFee / partCount),
              discount: Math.round(validDiscountRupees / partCount),
              other_charges: Math.round(validOtherCharges / partCount),
              amount: partAmount,
              amount_paid: 0,
              currency: "INR",
              due_date: partDueDate,
              notes: notes.trim() ? `${notes.trim()} (EMI ${i} of ${partCount})` : `EMI ${i} of ${partCount}`,
              status: "pending" as const,
              paid_date: null,
              emi_group: emiGroupId,
              emi_no: i,
              emi_total: partCount,
            })
          }

          const { error } = await supabase.from("fees").insert(rowsToInsert)
          if (error) {
            toast.error("Could not add EMI instalments: " + error.message)
            return
          }
          toast.success(`${partCount} EMI instalments created`)
        } else {
          const { error } = await supabase.from("fees").insert({
            client_id: targetClientId,
            package_fee: validPkgFee,
            discount: validDiscountRupees,
            other_charges: validOtherCharges,
            amount: validFinalAmount,
            amount_paid: resolvedAmountPaid,
            currency: "INR",
            due_date: dueDate,
            notes: notes.trim() || null,
            status: resolvedStatus,
            paid_date: resolvedPaidDate,
          })
          if (error) {
            toast.error("Could not add payment: " + error.message)
            return
          }
          toast.success("Payment added")
        }
      } else if (mode === "edit" && initialFee) {
        const { error } = await supabase
          .from("fees")
          .update({
            package_fee: validPkgFee,
            discount: validDiscountRupees,
            other_charges: validOtherCharges,
            amount: validFinalAmount,
            amount_paid: resolvedAmountPaid,
            status: resolvedStatus,
            paid_date: resolvedPaidDate,
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

  const isPackageReadOnly = mode === "edit" && !alsoUpdateClient
  const extraPackages = Array.from(
    new Set(
      [packageName, currentClientSnapshot?.packageName].filter(
        (v): v is string => Boolean(v && v.trim() && !PACKAGES.some((p) => p.name === v))
      )
    )
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="w-full max-w-md bg-[#111111] border border-[#222222] rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#222222] shrink-0">
            <h2 className="text-xl font-bold font-heading">
              {mode === "add" ? "Add Payment / Bill" : "Edit Bill"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="p-5 space-y-3.5 overflow-y-auto">
            {!clientId && clientOptions.length > 0 && mode === "add" && (
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Client
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    const nextId = e.target.value
                    setSelectedClientId(nextId)
                    const c = clientOptions.find((item) => item.id === nextId)
                    if (c?.packageName) {
                      handlePackageChange(c.packageName, c.startDate || startDate)
                    }
                  }}
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
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                Package
              </label>
              <select
                value={packageName}
                disabled={isPackageReadOnly}
                onChange={(e) => {
                  if (isPackageReadOnly) return
                  handlePackageChange(e.target.value)
                }}
                className={isPackageReadOnly ? readOnlyInputClass : `${inputClass} bg-[#1A1A1A]`}
              >
                <option value="">
                  {mode === "edit" && !packageName ? "Not saved on this old bill" : "Select package…"}
                </option>
                {extraPackages.map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg}
                  </option>
                ))}
                {PACKAGES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}{packageFeeMap[p.name] ? ` — ₹${packageFeeMap[p.name].toLocaleString("en-IN")}` : ""}
                  </option>
                ))}
              </select>
              {isPackageReadOnly ? (
                <p className="text-[11px] text-text-muted mt-1">This is the client&apos;s current package</p>
              ) : (
                mode === "edit" && !packageName && (
                  <p className="text-[11px] text-text-muted mt-1">Not saved on this old bill</p>
                )
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  disabled={isPackageReadOnly}
                  readOnly={isPackageReadOnly}
                  onChange={(e) => {
                    if (isPackageReadOnly) return
                    handleStartDateChange(e.target.value)
                  }}
                  className={isPackageReadOnly ? readOnlyInputClass : inputClass}
                />
                {mode === "edit" && !startDate && (
                  <p className="text-[11px] text-text-muted mt-1">Not saved on this old bill</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  disabled={isPackageReadOnly}
                  readOnly={isPackageReadOnly}
                  onChange={(e) => {
                    if (isPackageReadOnly) return
                    setEndDate(e.target.value)
                  }}
                  className={isPackageReadOnly ? readOnlyInputClass : inputClass}
                />
                {mode === "edit" && !endDate && (
                  <p className="text-[11px] text-text-muted mt-1">Not saved on this old bill</p>
                )}
              </div>
            </div>

            {/* Checkbox: Also update this client's package and dates */}
            <div className="rounded-xl bg-[#1A1A1A] border border-[#333333] p-3 space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alsoUpdateClient}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAlsoUpdateClient(checked)
                    if (!checked && mode === "edit") {
                      setPackageName(
                        currentClientSnapshot?.packageName ||
                          initialFee?.packageName ||
                          initialFee?.package_name ||
                          ""
                      )
                      setStartDate(currentClientSnapshot?.startDate || initialFee?.startDate || "")
                      setEndDate(currentClientSnapshot?.endDate || initialFee?.endDate || "")
                    }
                  }}
                  className="size-4 accent-[#C9A84C] rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-white">
                  Also update this client&apos;s package and dates
                </span>
              </label>
              {alsoUpdateClient ? (
                <div className="text-[11px] text-amber-300/90 space-y-0.5 pl-6">
                  <p className="font-semibold">Will update client profile on save:</p>
                  <p>
                    Package: <span className="text-text-muted">{currentClientSnapshot?.packageName || "—"}</span> &rarr;{" "}
                    <span className="text-white font-semibold">{packageName || "—"}</span>
                  </p>
                  <p>
                    Dates:{" "}
                    <span className="text-text-muted">
                      {currentClientSnapshot?.startDate || "—"} to {currentClientSnapshot?.endDate || "—"}
                    </span>{" "}
                    &rarr;{" "}
                    <span className="text-white font-semibold">
                      {startDate || "—"} to {endDate || "—"}
                    </span>
                  </p>
                  <p>
                    Client Fee:{" "}
                    <span className="text-text-muted">
                      ₹{Number(currentClientSnapshot?.feeAmount ?? 0).toLocaleString("en-IN")}
                    </span>{" "}
                    &rarr; <span className="text-white font-semibold">₹{finalAmount.toLocaleString("en-IN")}</span>
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-text-muted pl-6">
                  Client&apos;s current package ({currentClientSnapshot?.packageName || "—"}) and dates will stay unchanged.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Package Fee (₹)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={packageFee}
                  onChange={(e) => {
                    const val = e.target.value
                    setPackageFee(val)
                    recomputeErrors({ packageFee: val })
                  }}
                  placeholder="e.g. 15000"
                  className={fieldErrors.packageFee ? errorInputClass : inputClass}
                />
                {fieldErrors.packageFee && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.packageFee}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Discount ({discountMode === "PCT" ? "%" : "₹"})
                  </label>
                  <div className="flex rounded-lg bg-[#1A1A1A] border border-[#333333] p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode("INR")
                        recomputeErrors({ discountMode: "INR" })
                      }}
                      className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${discountMode === "INR" ? "bg-[#C9A84C] text-black" : "text-text-muted"}`}
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountMode("PCT")
                        recomputeErrors({ discountMode: "PCT" })
                      }}
                      className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${discountMode === "PCT" ? "bg-[#C9A84C] text-black" : "text-text-muted"}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={discountValue}
                  onChange={(e) => {
                    const val = e.target.value
                    setDiscountValue(val)
                    recomputeErrors({ discountValue: val })
                  }}
                  placeholder="0"
                  className={fieldErrors.discountValue ? errorInputClass : inputClass}
                />
                {fieldErrors.discountValue && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.discountValue}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Other Charges (₹)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otherChargesStr}
                  onChange={(e) => {
                    const val = e.target.value
                    setOtherChargesStr(val)
                    recomputeErrors({ otherChargesStr: val })
                  }}
                  placeholder="0"
                  className={fieldErrors.otherCharges ? errorInputClass : inputClass}
                />
                {fieldErrors.otherCharges && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.otherCharges}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Amount Paid So Far (₹)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountPaidStr}
                  onChange={(e) => {
                    const val = e.target.value
                    setAmountPaidStr(val)
                    recomputeErrors({ amountPaidStr: val })
                  }}
                  placeholder="0"
                  className={fieldErrors.amountPaid ? errorInputClass : inputClass}
                />
                {fieldErrors.amountPaid && (
                  <p className="text-red-400 text-xs mt-1">{fieldErrors.amountPaid}</p>
                )}
              </div>
            </div>

            {/* Live Bill Breakdown */}
            <div className="rounded-xl bg-[#1A1A1A] border border-[#333333] p-3 space-y-1 text-xs">
              <div className="flex justify-between text-text-muted">
                <span>Package Fee</span>
                <span className="text-white font-semibold">₹{numPackageFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Discount{discountMode === "PCT" ? ` (${preview.discountValue}%)` : ""}</span>
                <span className="font-semibold">− ₹{discountRupees.toLocaleString("en-IN")}</span>
              </div>
              {numOtherCharges > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Other Charges</span>
                  <span className="text-white font-semibold">+ ₹{numOtherCharges.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="border-t border-[#333333] pt-1.5 flex justify-between text-sm font-bold">
                <span className="text-white">Final Amount</span>
                <span className="text-accent-orange">₹{finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* EMI option: only shown when client has EMI allowed and adding new payment */}
            {mode === "add" && currentClientSnapshot?.emiAllowed && (
              <div className="rounded-2xl bg-[#1A1A1A] border border-[#C9A84C]/40 p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEmi}
                    onChange={(e) => setIsEmi(e.target.checked)}
                    className="size-5 accent-[#C9A84C] rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-white block">Pay in instalments (EMI)</span>
                    <span className="text-xs text-text-muted">Split total into monthly instalments</span>
                  </div>
                </label>

                {isEmi && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <p className="text-xs text-text-muted font-semibold">Number of monthly parts:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([2, 3, 4] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setEmiParts(n)}
                          className={`h-10 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                            emiParts === n
                              ? "bg-[#C9A84C] text-black border-[#C9A84C]"
                              : "bg-[#141414] border-[#333333] text-white hover:border-[#555]"
                          }`}
                        >
                          {n} parts
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#C9A84C] font-medium pt-1">
                      Will create {emiParts} bills of ~₹{Math.floor(finalAmount / emiParts).toLocaleString("en-IN")}/mo starting on due date.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Payment due date
                </label>
                {(startDate || endDate) && (
                  <span className="text-[11px] text-text-muted">
                    Package: {startDate || "—"} to {endDate || "—"}
                  </span>
                )}
              </div>
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
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Initial Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("pending")
                      setAmountPaidStr("0")
                      recomputeErrors({ amountPaidStr: "0" })
                    }}
                    className={`h-11 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border ${
                      status === "pending"
                        ? "bg-accent-orange text-black border-accent-orange"
                        : "bg-[#1A1A1A] border-[#333333] text-text-muted"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("paid")
                      const paidFull = String(finalAmount)
                      setAmountPaidStr(paidFull)
                      recomputeErrors({ amountPaidStr: paidFull })
                    }}
                    className={`h-11 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border ${
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
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
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

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 rounded-2xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
