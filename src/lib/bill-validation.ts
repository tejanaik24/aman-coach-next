import { finalAmount, paidSoFar, amountDue } from "@/lib/fee-math"
import type { Fee } from "@/types"

export type DiscountMode = "INR" | "PCT"

export interface BillValidationInput {
  packageFee: string | number | null | undefined
  discountValue?: string | number | null | undefined
  discountMode?: DiscountMode
  otherCharges?: string | number | null | undefined
  rewardPointsRedeemed?: string | number | null | undefined
  amountPaid?: string | number | null | undefined
}

export interface BillFieldErrors {
  packageFee?: string
  discountValue?: string
  otherCharges?: string
  amountPaid?: string
  general?: string
}

export interface ValidatedBillValues {
  packageFee: number
  discountValue: number
  discountMode: DiscountMode
  discountRupees: number
  otherCharges: number
  rewardPointsRedeemed: number
  finalAmount: number
  amountPaid: number
}

export interface BillValidationResult {
  valid: boolean
  firstError: string | null
  errors: BillFieldErrors
  values: ValidatedBillValues
}

function toTrimmedString(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ""
  return String(val).trim()
}

function hasDecimalPart(str: string): boolean {
  return /^-?\d*\.\d+$/.test(str) || /^-?\d+\.\d*$/.test(str)
}

function isNegativeNumeric(str: string): boolean {
  return /^-\d+(\.\d+)?$/.test(str)
}

function isWholeDigits(str: string): boolean {
  return /^\d+$/.test(str)
}

/**
 * Safely parse a whole rupee number for live preview without crashing or returning NaN.
 */
export function safePreviewRupees(val: string | number | null | undefined): number {
  const str = toTrimmedString(val)
  if (!isWholeDigits(str)) return 0
  const n = Number(str)
  return Number.isSafeInteger(n) && n >= 0 ? n : 0
}

/**
 * Compute live bill summary numbers (safe even when inputs contain invalid characters).
 */
export function computeBillPreview(input: BillValidationInput): ValidatedBillValues {
  const discountMode: DiscountMode = input.discountMode === "PCT" ? "PCT" : "INR"
  const packageFee = safePreviewRupees(input.packageFee)
  const discountValue = safePreviewRupees(input.discountValue)
  const otherCharges = safePreviewRupees(input.otherCharges)
  const rewardPointsRedeemed = safePreviewRupees(input.rewardPointsRedeemed)
  const amountPaid = safePreviewRupees(input.amountPaid)

  const discountRupees =
    discountMode === "PCT"
      ? Math.round((packageFee * Math.min(discountValue, 100)) / 100)
      : discountValue

  const computedFinal = Math.max(packageFee + otherCharges - discountRupees - rewardPointsRedeemed, 0)

  return {
    packageFee,
    discountValue,
    discountMode,
    discountRupees,
    otherCharges,
    rewardPointsRedeemed,
    finalAmount: computedFinal,
    amountPaid,
  }
}

/**
 * Shared validation for all bill/payment screens and server routes.
 * Enforces whole rupees, required positive package fee, valid discount (% or INR),
 * non-negative other charges, and amount paid <= final bill.
 */
export function validateBillInput(input: BillValidationInput): BillValidationResult {
  const errors: BillFieldErrors = {}
  const discountMode: DiscountMode = input.discountMode === "PCT" ? "PCT" : "INR"

  // a) Package fee: required. Empty, 0, negative, or not a number -> "Please enter the package fee."
  //    Decimals -> "Please enter whole rupees only (no paise)."
  const pkgStr = toTrimmedString(input.packageFee)
  let packageFee = 0
  if (pkgStr === "" || isNegativeNumeric(pkgStr)) {
    errors.packageFee = "Please enter the package fee."
  } else if (hasDecimalPart(pkgStr)) {
    errors.packageFee = "Please enter whole rupees only (no paise)."
  } else if (!isWholeDigits(pkgStr)) {
    errors.packageFee = "Please enter the package fee."
  } else {
    const parsed = Number(pkgStr)
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      errors.packageFee = "Please enter the package fee."
    } else {
      packageFee = parsed
    }
  }

  // b) Discount: empty = 0 is fine. Negative -> "Discount cannot be negative."
  //    Decimals -> "Please enter whole rupees only (no paise)."
  //    % > 100 -> "Discount cannot be more than 100%."
  //    INR > packageFee -> "Discount cannot be more than the package fee."
  const discStr = toTrimmedString(input.discountValue)
  let discountValue = 0
  if (discStr !== "") {
    if (isNegativeNumeric(discStr) || discStr.startsWith("-")) {
      errors.discountValue = "Discount cannot be negative."
    } else if (hasDecimalPart(discStr)) {
      errors.discountValue = "Please enter whole rupees only (no paise)."
    } else if (!isWholeDigits(discStr)) {
      errors.discountValue = "Please enter a valid discount in whole rupees (digits only)."
    } else {
      const parsedDisc = Number(discStr)
      if (!Number.isSafeInteger(parsedDisc) || parsedDisc < 0) {
        errors.discountValue = "Please enter a valid discount in whole rupees (digits only)."
      } else if (discountMode === "PCT" && parsedDisc > 100) {
        errors.discountValue = "Discount cannot be more than 100%."
      } else if (discountMode === "INR" && packageFee > 0 && parsedDisc > packageFee) {
        errors.discountValue = "Discount cannot be more than the package fee."
      } else {
        discountValue = parsedDisc
      }
    }
  }

  // d) Other charges: empty = 0 is fine. Negative -> "Other charges cannot be negative."
  //    Decimals -> "Please enter whole rupees only (no paise)."
  const otherStr = toTrimmedString(input.otherCharges)
  let otherCharges = 0
  if (otherStr !== "") {
    if (isNegativeNumeric(otherStr) || otherStr.startsWith("-")) {
      errors.otherCharges = "Other charges cannot be negative."
    } else if (hasDecimalPart(otherStr)) {
      errors.otherCharges = "Please enter whole rupees only (no paise)."
    } else if (!isWholeDigits(otherStr)) {
      errors.otherCharges = "Please enter valid other charges in whole rupees (digits only)."
    } else {
      const parsedOther = Number(otherStr)
      if (!Number.isSafeInteger(parsedOther) || parsedOther < 0) {
        errors.otherCharges = "Please enter valid other charges in whole rupees (digits only)."
      } else {
        otherCharges = parsedOther
      }
    }
  }

  const rewardPointsRedeemed = safePreviewRupees(input.rewardPointsRedeemed)
  const discountRupees =
    discountMode === "PCT"
      ? Math.round((packageFee * discountValue) / 100)
      : discountValue

  const computedFinal = packageFee + otherCharges - discountRupees - rewardPointsRedeemed
  if (!errors.packageFee && !errors.discountValue && !errors.otherCharges && computedFinal < 0) {
    errors.general = "Final bill amount cannot be negative."
  }
  const safeFinal = Math.max(computedFinal, 0)

  // c) Amount paid: empty = 0 is fine. Negative -> error.
  //    Decimals -> "Please enter whole rupees only (no paise)."
  //    More than final amount -> "Amount paid cannot be more than the final bill (Rs X)."
  const paidStr = toTrimmedString(input.amountPaid)
  let amountPaid = 0
  if (paidStr !== "") {
    if (isNegativeNumeric(paidStr) || paidStr.startsWith("-")) {
      errors.amountPaid = "Amount paid cannot be negative."
    } else if (hasDecimalPart(paidStr)) {
      errors.amountPaid = "Please enter whole rupees only (no paise)."
    } else if (!isWholeDigits(paidStr)) {
      errors.amountPaid = "Please enter a valid amount paid in whole rupees (digits only)."
    } else {
      const parsedPaid = Number(paidStr)
      if (!Number.isSafeInteger(parsedPaid) || parsedPaid < 0) {
        errors.amountPaid = "Please enter a valid amount paid in whole rupees (digits only)."
      } else if (!errors.packageFee && parsedPaid > safeFinal) {
        errors.amountPaid = `Amount paid cannot be more than the final bill (Rs ${safeFinal}).`
      } else {
        amountPaid = parsedPaid
      }
    }
  }

  const firstError =
    errors.packageFee ??
    errors.discountValue ??
    errors.otherCharges ??
    errors.amountPaid ??
    errors.general ??
    null

  return {
    valid: firstError === null,
    firstError,
    errors,
    values: {
      packageFee,
      discountValue,
      discountMode,
      discountRupees,
      otherCharges,
      rewardPointsRedeemed,
      finalAmount: safeFinal,
      amountPaid,
    },
  }
}

export interface ClientBillContext {
  id?: string
  member_number?: number | null
  package_name?: string | null
  start_date?: string | null
  end_date?: string | null
}

export interface ProfileBillContext {
  name?: string | null
  phone?: string | null
  avatar_url?: string | null
}

export interface MappedBill {
  id: string
  clientId: string
  packageFee: number
  amount: number
  dueDate: string
  paidDate: string | null
  createdAt: string
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
  balanceDue: number
  notes: string | null
}

/**
 * Shared mapping function used by BOTH /fees and /clients/[id] so bill details
 * (package, start date, end date, package fee, discount, other charges, paid so far, due date, notes)
 * never drift between the two screens.
 */
export function mapFeeToBill(
  f: Fee & { packageName?: string | null },
  client?: ClientBillContext | null,
  profile?: ProfileBillContext | null
): MappedBill {
  const amount = finalAmount(f)
  const discount = Number(f.discount ?? 0)
  const otherCharges = Number(f.other_charges ?? 0)
  const rewardPointsRedeemed = Number(f.reward_points_redeemed ?? 0)
  const packageFee =
    f.package_fee !== null && f.package_fee !== undefined && Number(f.package_fee) > 0
      ? Number(f.package_fee)
      : amount + discount - otherCharges + rewardPointsRedeemed
  const amountPaid = paidSoFar(f)
  const balanceDue = amountDue(f)
  const invoiceNumber =
    f.invoice_number ||
    (client?.member_number ? String(client.member_number).padStart(5, "0") : `INV-${f.id.slice(0, 6).toUpperCase()}`)

  return {
    id: f.id,
    clientId: f.client_id,
    packageFee,
    amount,
    dueDate: f.due_date,
    paidDate: f.paid_date ?? null,
    createdAt: f.created_at || new Date().toISOString(),
    status: f.status,
    clientName: profile?.name ?? "Unknown",
    clientPhone: profile?.phone ?? "",
    clientAvatar: profile?.avatar_url ?? null,
    invoiceNumber,
    memberNumber: client?.member_number ?? null,
    packageName: f.package_name || f.packageName || client?.package_name || null,
    startDate: client?.start_date || null,
    endDate: client?.end_date || null,
    otherCharges,
    discount,
    rewardPointsRedeemed,
    amountPaid,
    balanceDue,
    notes: f.notes ?? null,
  }
}

