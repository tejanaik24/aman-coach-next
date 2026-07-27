import { PublicPageShell } from "@/components/shared/PublicPageShell"

export default function OffersPage() {
  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Offers">
      <div className="ledger p-8 text-center">
        <p className="text-text-muted text-sm">No offer available.</p>
      </div>
    </PublicPageShell>
  )
}
