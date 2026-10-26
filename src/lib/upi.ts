export const COACH_UPI_ID = "9815690656@upi"
export const COACH_UPI_NAME = "Aman Khurana Fitness"
export const COACH_UPI_PHONE = "9815690656"
// UPI apps cap "pay" links to a personal UPI ID at ₹2,000 (PhonePe: "You can pay up to ₹2,000…").
// Above that the client pays to the mobile number by hand. Goes away with a business UPI ID / Razorpay.
export const UPI_LINK_LIMIT = 2000

// Bank transfer details, exactly as Aman sent them (his old renewal message, 2026-10-14).
export const COACH_BANK = {
  bank: "HDFC Bank",
  accountNo: "50100833186672",
  ifsc: "HDFC0000450",
}

export function generateUpiLink(amount: number, note?: string): string {
  const safeAmount = Math.max(0, Number(amount) || 0).toFixed(2)
  const cleanNote = (note || "Coaching Fee").trim().slice(0, 40) || "Coaching Fee"
  const encodedPayee = encodeURIComponent(COACH_UPI_NAME)
  const encodedNote = encodeURIComponent(cleanNote)
  return `upi://pay?pa=${COACH_UPI_ID}&pn=${encodedPayee}&am=${safeAmount}&cu=INR&tn=${encodedNote}`
}

export function getUpiQrData(amount: number, note?: string): string {
  return generateUpiLink(amount, note)
}

export function getUpiDeepLink(amount: number, note?: string): string {
  return generateUpiLink(amount, note)
}

