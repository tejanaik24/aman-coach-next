// Plain helpers (no "use client") so server routes can use them too.
// Importing them from a client component file crashes on the server.

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
