import Link from "next/link"
import { PublicPageShell } from "@/components/shared/PublicPageShell"

const PACKAGES = [
  { name: "On Call Consultation — One time on call consult", days: "1 Day", cta: "Book Now", href: "/book" },
  { name: "Bodybuilding Contest Prep (24 Weeks)", days: "168 Days" },
  { name: "Bodybuilding Contest Prep (12 Weeks)", days: "84 Days" },
  { name: "Complete Online Coaching - Any Lifestyle Goals (1 Year)", days: "365 Days" },
  { name: "Complete Online Coaching - Any Lifestyle Goals (24 Weeks)", days: "168 Days" },
  { name: "Complete Online Coaching - Any Lifestyle Goals (12 Weeks)", days: "84 Days" },
  { name: "Only Nutrition/Diet Consultancy (12 Weeks)", days: "84 Days" },
  { name: "Only Nutrition/Diet Consultancy (24 Weeks)", days: "168 Days" },
  { name: "Bodybuilding Posing Coaching (4 Virtual Sessions)", days: "30 Days" },
  { name: "Bodybuilding Posing Coaching (8 Virtual Sessions)", days: "60 Days" },
  { name: "Online Antenatal - Postnatal Complete Care (2nd - 4th Trimester)", days: "280 Days" },
  { name: "Child Nutrition (One Time Consult)", days: "3 Days" },
  { name: "Child Nutrition (1 Month Consult)", days: "30 Days" },
  { name: 'Offline "Exercise Training Execution Camp" (3-5 Days)', days: "30 Days" },
  { name: "POSTPARTUM Care - Training & Nutrition (12 Weeks)", days: "84 Days" },
  { name: "POSTPARTUM Care - Training & Nutrition (24 Weeks)", days: "168 Days" },
]

export default function PackagesPage() {
  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Coaching Packages" bg="ghost-plans.jpg">
      <div className="space-y-3">
        {PACKAGES.map((pkg) => (
          <div key={pkg.name} className="ledger p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-text-primary text-sm font-medium">{pkg.name}</p>
              <p className="text-text-muted text-xs mt-1">{pkg.days}</p>
            </div>
            <Link
              href={pkg.href || `/enquiry?interest=${encodeURIComponent(pkg.name)}`}
              className="shrink-0 bg-accent-orange text-bg-primary font-heading text-xs px-4 py-2 rounded-full"
            >
              {pkg.cta || "Enquire Now"}
            </Link>
          </div>
        ))}
      </div>
    </PublicPageShell>
  )
}
