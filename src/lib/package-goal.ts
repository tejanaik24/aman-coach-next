// Plain helpers (no "use client") so server routes and client components can share a single source of truth.

export interface Package {
  name: string
  days: number
}

export const PACKAGES: Package[] = [
  { name: "One Time On-Call Consult", days: 1 },
  { name: "Bodybuilding Contest Prep 12 Weeks", days: 84 },
  { name: "Bodybuilding Contest Prep 24 Weeks", days: 168 },
  { name: "Complete Online Coaching 12 Weeks", days: 84 },
  { name: "Complete Online Coaching 24 Weeks", days: 168 },
  { name: "Complete Online Coaching 1 Year", days: 365 },
  // Legacy plan, admin/billing only. Public /packages page has its own list, so this stays hidden from visitors.
  { name: "Online Only Workout Plan 12 Weeks", days: 84 },
  { name: "Only Nutrition/Diet 12 Weeks", days: 84 },
  { name: "Only Nutrition/Diet 24 Weeks", days: 168 },
  { name: "Bodybuilding Posing 4 Sessions", days: 30 },
  { name: "Bodybuilding Posing 8 Sessions", days: 60 },
  { name: "Antenatal-Postnatal Complete Care", days: 280 },
  { name: "Child Nutrition One Time", days: 3 },
  { name: "Child Nutrition 1 Month", days: 30 },
  { name: "Offline Training Camp", days: 30 },
  { name: "Postpartum Care 12 Weeks", days: 84 },
  { name: "Postpartum Care 24 Weeks", days: 168 },
]

export const PACKAGE_LIST = PACKAGES

export function calculateEndDate(startDate: string, days: number): string {
  const parts = startDate.split("-").map(Number)
  if (parts.length === 3 && !parts.some(isNaN)) {
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days))
    return d.toISOString().split("T")[0]
  }
  const d = new Date(startDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

export function isAntenatalPackage(packageName: string): boolean {
  return packageName.startsWith("Antenatal") || packageName.startsWith("Postpartum")
}

// Goal is derived from the package so Aman never has to pick it.
export function goalForPackage(packageName: string): string {
  if (packageName.includes("Contest Prep") || packageName.includes("Posing")) return "Contest Prep"
  if (isAntenatalPackage(packageName)) return "Antenatal/Postnatal"
  if (packageName.startsWith("Child Nutrition")) return "Child Nutrition"
  return "Lifestyle Coaching"
}
