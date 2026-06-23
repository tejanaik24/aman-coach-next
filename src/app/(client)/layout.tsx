import ClientBottomNav from "@/components/shared/ClientBottomNav"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-24">{children}</div>
      <ClientBottomNav />
    </>
  )
}
