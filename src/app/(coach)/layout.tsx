import CoachBottomNav from "@/components/shared/CoachBottomNav"

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="relative min-h-screen pb-20">{children}</div>
      <CoachBottomNav />
    </>
  )
}
