"use client"

import Link from "next/link"
import { PublicPageShell } from "@/components/shared/PublicPageShell"

const PACKAGES = [
  { name: "On Call Consultation — One time on call consult", days: "1 Day", amount: 1500, cta: "Book Now", href: "/book" },
  { name: "Bodybuilding Contest Prep (24 Weeks)", days: "168 Days", amount: 45000 },
  { name: "Bodybuilding Contest Prep (12 Weeks)", days: "84 Days", amount: 25000 },
  { name: "Complete Online Coaching - Any Lifestyle Goals (1 Year)", days: "365 Days", amount: 50000 },
  { name: "Complete Online Coaching - Any Lifestyle Goals (24 Weeks)", days: "168 Days", amount: 28000 },
  { name: "Complete Online Coaching - Any Lifestyle Goals (12 Weeks)", days: "84 Days", amount: 15000 },
  { name: "Only Nutrition/Diet Consultancy (12 Weeks)", days: "84 Days", amount: 9999 },
  { name: "Only Nutrition/Diet Consultancy (24 Weeks)", days: "168 Days", amount: 17999 },
  { name: "Bodybuilding Posing Coaching (4 Virtual Sessions)", days: "30 Days", amount: 5000 },
  { name: "Bodybuilding Posing Coaching (8 Virtual Sessions)", days: "60 Days", amount: 9000 },
  { name: "Online Antenatal - Postnatal Complete Care (2nd - 4th Trimester)", days: "280 Days", amount: 35000 },
  { name: "Child Nutrition (One Time Consult)", days: "3 Days", amount: 2000 },
  { name: "Child Nutrition (1 Month Consult)", days: "30 Days", amount: 6000 },
  { name: 'Offline "Exercise Training Execution Camp" (3-5 Days)', days: "30 Days", amount: 12000 },
  { name: "POSTPARTUM Care - Training & Nutrition (12 Weeks)", days: "84 Days", amount: 16000 },
  { name: "POSTPARTUM Care - Training & Nutrition (24 Weeks)", days: "168 Days", amount: 29000 },
]

export default function PackagesPage() {
  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Coaching Packages" bg="ghost-plans.jpg">
      <div className="space-y-3">
        {PACKAGES.map((pkg) => (
          <div key={pkg.name} className="ledger p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-text-primary text-sm font-medium">{pkg.name}</p>
              <p className="text-text-muted text-xs mt-1">Duration: {pkg.days} · <span className="text-accent-orange font-bold font-mono">₹{pkg.amount.toLocaleString("en-IN")}</span></p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={pkg.href || `/enquiry?interest=${encodeURIComponent(pkg.name)}`}
                className="bg-bg-elevated border border-border-subtle text-text-primary hover:border-accent-orange font-heading text-xs px-3 py-2 rounded-full transition-colors"
              >
                {pkg.cta || "Enquire"}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </PublicPageShell>
  )
}
