const UPI_ID = "amankhurana@upi"
const PAYEE_NAME = "Aman Khurana Fitness"

export function generateUpiLink(amount: number, note?: string): string {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: PAYEE_NAME,
    am: amount.toString(),
    tn: note || "Payment for coaching services",
    cu: "INR",
  })
  return `upi://pay?${params.toString()}`
}

export function getUpiQrData(amount: number, note?: string): string {
  return generateUpiLink(amount, note)
}

export function getUpiDeepLink(amount: number, note?: string): string {
  const base = generateUpiLink(amount, note)
  return `upi://pay?${base.split("?")[1]}`
}
