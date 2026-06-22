import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AK Fitness | Client Dashboard",
}

export default function ClientSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
