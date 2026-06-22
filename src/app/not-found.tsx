import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <div className="max-w-sm">
        <span className="text-6xl mb-4 block">🔍</span>
        <h1 className="font-heading text-4xl text-white mb-2">Page not found</h1>
        <p className="text-sm text-zinc-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-full bg-[#FFB800] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
