import PlanDocuments from "@/components/client/PlanDocuments"

// Plans the coach sent as PDFs show first; the in-app plan (if any) is below.
export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pt-6">
        <PlanDocuments kind="workout" />
      </div>
      {children}
    </>
  )
}
