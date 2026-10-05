// Clients sign in with their mobile number. Supabase auth needs an email, so the
// number maps to a placeholder address on our own domain (mail to it is skipped).
const DOMAIN = "clients.amankhuranafitness.com"

export function phoneEmail(digits: string): string {
  return `${digits.replace(/\D/g, "").slice(-10)}@${DOMAIN}`
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DOMAIN}`)
}

/** Login box accepts an email OR a mobile number. */
export function loginIdentifierToEmail(input: string): string {
  const v = input.trim()
  if (v.includes("@")) return v
  const digits = v.replace(/\D/g, "")
  return digits.length >= 10 ? phoneEmail(digits) : v
}
