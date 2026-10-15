// Clients sign in with their mobile number. Supabase auth needs an email, so the
// number maps to a placeholder address on our own domain (mail to it is skipped).
export const PHONE_AUTH_DOMAIN = "clients.amankhuranafitness.com"

export function phoneToAuthEmail(input: string): string | null {
  const clean = input.replace(/\D/g, "")
  if (clean.length < 6) return null
  let local: string
  if (clean.length === 10) {
    local = clean
  } else if (clean.length === 12 && clean.startsWith("91")) {
    local = clean.slice(-10)
  } else {
    local = clean
  }
  return `${local}@${PHONE_AUTH_DOMAIN}`
}

export function phoneEmail(digits: string): string {
  return phoneToAuthEmail(digits) ?? ""
}

export function isPlaceholderEmail(email: string): boolean {
  const lower = email.toLowerCase()
  return lower.endsWith(`@${PHONE_AUTH_DOMAIN}`) || lower.endsWith("@phone.akfitness.in")
}

/** Login box accepts an email OR a mobile number. */
export function loginIdentifierToEmail(input: string): string {
  const v = input.trim()
  if (v.includes("@")) return v
  return phoneToAuthEmail(v) ?? v
}
