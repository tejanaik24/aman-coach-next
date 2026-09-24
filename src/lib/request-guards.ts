const WINDOWS = new Map<string, { count: number; resetAt: number }>()

function requestIdentity(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"
}

/**
 * A lightweight first line of defense for public forms. Platform-level rate limiting
 * should still be added before a large campaign, because serverless instances do not
 * share this in-memory state.
 */
export function isRateLimited(request: Request, scope: string, maxRequests = 5, windowMs = 15 * 60 * 1000): boolean {
  const key = `${scope}:${requestIdentity(request)}`
  const now = Date.now()
  const existing = WINDOWS.get(key)
  if (!existing || existing.resetAt <= now) {
    WINDOWS.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (existing.count >= maxRequests) return true
  existing.count += 1
  return false
}

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function isAllowedImage(file: File): boolean {
  return file.size > 0 && file.size <= MAX_IMAGE_UPLOAD_BYTES && ALLOWED_IMAGE_TYPES.has(file.type)
}
