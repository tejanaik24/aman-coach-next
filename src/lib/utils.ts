import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Phones block window.open after an await; fall back to the same tab so the tap never does nothing.
// ("noopener" can't be passed as a feature: window.open then always returns null.)
export function openUrl(url: string) {
  const w = window.open(url, "_blank")
  if (w) w.opener = null
  else window.location.href = url
}
