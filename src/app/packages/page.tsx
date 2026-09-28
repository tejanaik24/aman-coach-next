"use client"

import Link from "next/link"
import { PublicPageShell } from "@/components/shared/PublicPageShell"

const IMG = {
  consult: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80&auto=format&fit=crop",
  contestPrep: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80&auto=format&fit=crop",
  onlineCoaching: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&auto=format&fit=crop",
  nutrition: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80&auto=format&fit=crop",
  posing: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80&auto=format&fit=crop",
  antenatal: "https://images.unsplash.com/photo-1593810451137-5dc55105dace?w=400&q=80&auto=format&fit=crop",
  childNutrition: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=400&q=80&auto=format&fit=crop",
  camp: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&q=80&auto=format&fit=crop",
  postpartum: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&q=80&auto=format&fit=crop",
}

const PACKAGES = [
  { name: "On Call Consultation — One time on call consult", days: "1 Day", amount: 1500, cta: "Book Now", href: "/book", image: IMG.consult },
  { name: "Bodybuilding Contest Prep (24 Weeks)", days: "168 Days", amount: 45000, image: IMG.contestPrep },
  { name: "Bodybuilding Contest Prep (12 Weeks)", days: "84 Days", amount: 25000, image: IMG.contestPrep },
  { name: "Complete Online Coaching - Any Lifestyle Goals (1 Year)", days: "365 Days", amount: 50000, image: IMG.onlineCoaching },
  { name: "Complete Online Coaching - Any Lifestyle Goals (24 Weeks)", days: "168 Days", amount: 28000, image: IMG.onlineCoaching },
  { name: "Complete Online Coaching - Any Lifestyle Goals (12 Weeks)", days: "84 Days", amount: 15000, image: IMG.onlineCoaching },
  { name: "Only Nutrition/Diet Consultancy (12 Weeks)", days: "84 Days", amount: 9999, image: IMG.nutrition },
  { name: "Only Nutrition/Diet Consultancy (24 Weeks)", days: "168 Days", amount: 17999, image: IMG.nutrition },
  { name: "Bodybuilding Posing Coaching (4 Virtual Sessions)", days: "30 Days", amount: 5000, image: IMG.posing },
  { name: "Bodybuilding Posing Coaching (8 Virtual Sessions)", days: "60 Days", amount: 9000, image: IMG.posing },
  { name: "Online Antenatal - Postnatal Complete Care (2nd - 4th Trimester)", days: "280 Days", amount: 35000, image: IMG.antenatal },
  { name: "Child Nutrition (One Time Consult)", days: "3 Days", amount: 2000, image: IMG.childNutrition },
  { name: "Child Nutrition (1 Month Consult)", days: "30 Days", amount: 6000, image: IMG.childNutrition },
  { name: 'Offline "Exercise Training Execution Camp" (3-5 Days)', days: "30 Days", amount: 12000, image: IMG.camp },
  { name: "POSTPARTUM Care - Training & Nutrition (12 Weeks)", days: "84 Days", amount: 16000, image: IMG.postpartum },
  { name: "POSTPARTUM Care - Training & Nutrition (24 Weeks)", days: "168 Days", amount: 29000, image: IMG.postpartum },
]

export default function PackagesPage() {
  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Coaching Packages" bg="ghost-plans.jpg">
      <div className="space-y-3">
        {PACKAGES.map((pkg) => (
          <div key={pkg.name} className="ledger p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={pkg.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border-subtle" />
              <div>
                <p className="text-text-primary text-sm font-medium">{pkg.name}</p>
                <p className="text-text-muted text-xs mt-1">Duration: {pkg.days} · <span className="text-accent-orange font-bold font-mono">₹{pkg.amount.toLocaleString("en-IN")}</span></p>
              </div>
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
