import { ReactNode } from "react"
import Link from "next/link"

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 bg-black/95 border-b border-[#222222] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/home" className="text-xl font-bold text-white tracking-wider uppercase" style={{ fontFamily: "Bebas Neue, sans-serif" }}>
            AK FITNESS
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">
        {children}
      </main>
    </div>
  )
}
