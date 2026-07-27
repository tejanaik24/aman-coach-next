import { PublicPageShell } from "@/components/shared/PublicPageShell"

export default function GalleryPage() {
  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Photo Gallery">
      <div className="ledger p-8 text-center">
        <p className="text-text-muted text-sm">No photo available.</p>
      </div>
    </PublicPageShell>
  )
}
