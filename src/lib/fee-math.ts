export interface FeeLike {
  amount?: number | string | null
  amount_paid?: number | string | null
  amountPaid?: number | string | null
  status?: string | null
}

/**
 * final amount = fees.amount (already package fee - discount + other charges).
 */
export function finalAmount(fee: FeeLike): number {
  const n = Number(fee.amount ?? 0)
  return Number.isFinite(n) ? Math.max(n, 0) : 0
}

/**
 * paid so far = fees.amount_paid.
 * If status = 'paid' and amount_paid is 0 or less than amount, treat paid so far as the full amount (old rows).
 */
export function paidSoFar(fee: FeeLike): number {
  const finalAmt = finalAmount(fee)
  const rawPaid = Number(fee.amount_paid ?? fee.amountPaid ?? 0)
  const cleanPaid = Number.isFinite(rawPaid) ? Math.max(rawPaid, 0) : 0
  if (fee.status === "paid" && cleanPaid < finalAmt) {
    return finalAmt
  }
  return cleanPaid
}

/**
 * amount due = max(final amount - paid so far, 0).
 * A bill with status 'paid' always has due = 0.
 */
export function amountDue(fee: FeeLike): number {
  if (fee.status === "paid") return 0
  return Math.max(finalAmount(fee) - paidSoFar(fee), 0)
}

/**
 * True if status is 'paid' or (finalAmount > 0 and paidSoFar >= finalAmount).
 */
export function isFullyPaid(fee: FeeLike): boolean {
  const finalAmt = finalAmount(fee)
  return fee.status === "paid" || (finalAmt > 0 && paidSoFar(fee) >= finalAmt)
}

