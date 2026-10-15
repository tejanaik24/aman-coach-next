// Clients sign in with their mobile number. Supabase auth needs an email, so the
// number maps to a placeholder address on our own domain (mail to it is skipped).
export const PHONE_AUTH_DOMAIN = "clients.amankhuranafitness.com"

export function phoneEmail(digits: string): string {
  const clean = digits.replace(/\D/g, "")
  // If exactly 10 digits starting with 6-9 (standard Indian mobile without country code), prefix 91
  if (clean.length === 10 && /^[6-9]/.test(clean)) {
    return `91${clean}@${PHONE_AUTH_DOMAIN}`
  }
  return `${clean}@${PHONE_AUTH_DOMAIN}`
}

export function isPlaceholderEmail(email: string): boolean {
  const lower = email.toLowerCase()
  return lower.endsWith(`@${PHONE_AUTH_DOMAIN}`) || lower.endsWith("@phone.akfitness.in")
}

/** Login box accepts an email OR a mobile number. */
export function loginIdentifierToEmail(input: string): string {
  const v = input.trim()
  if (v.includes("@")) return v
  const digits = v.replace(/\D/g, "")
  if (!digits) return v
  // India 10-digit: if exactly 10 digits starting with 6-9, prefix 91
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}@${PHONE_AUTH_DOMAIN}`
  }
  return digits.length >= 6 ? `${digits}@${PHONE_AUTH_DOMAIN}` : v
}
