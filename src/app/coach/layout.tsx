import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AK Fitness | Coach Dashboard",
}

export default function CoachSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
