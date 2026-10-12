/**
 * Client-safe WhatsApp URL helpers (wa.me links and phone formatting).
 * Contains zero server-side imports so client components can safely import it.
 */

export function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = `91${cleaned}`
  }
  return cleaned
}

export function buildWhatsAppUrl(phone: string, message?: string): string {
  const digits = formatWhatsAppPhone(phone)
  if (!digits) return "https://wa.me/"
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

