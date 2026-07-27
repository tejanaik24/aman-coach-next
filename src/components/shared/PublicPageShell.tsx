import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function PublicPageShell({
  eyebrow,
  title,
  bg = "ghost-fees.jpg",
  children,
}: {
  eyebrow: string
  title: string
  bg?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen relative bg-bg-primary">
      <div className="ghost-bg" style={{ backgroundImage: `url(/images/backgrounds/${bg})` }} />
      <div className="grain-overlay" />
      <div className="relative z-10 px-5 pt-8 pb-16 max-w-lg mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-text-muted text-xs font-medium uppercase tracking-widest">
          <ArrowLeft className="size-3.5" /> Home
        </Link>
        <div>
          <p className="text-text-muted text-[11px] font-medium uppercase tracking-[0.2em] mb-2">{eyebrow}</p>
          <h1 className="font-heading italic text-4xl text-white">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
