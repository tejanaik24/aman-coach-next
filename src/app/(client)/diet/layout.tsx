import PlanDocuments from "@/components/client/PlanDocuments"

// Plans the coach sent as PDFs show first; the in-app plan (if any) is below.
export default function DietLayout({ children }: { children: React.ReactNode }) {
  // A sent PDF plan hides the "plan coming soon" empty state below it.
  return (
    <div className="[&:has([data-plan-docs])_[data-plan-empty]]:hidden">
      <div className="pt-6">
        <PlanDocuments kind="diet" />
        <PlanDocuments kind="other" />
      </div>
      {children}
    </div>
  )
}
