"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <div className="max-w-sm">
        <span className="text-6xl mb-4 block">⚠️</span>
        <h1 className="font-heading text-4xl text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-zinc-500 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-[#FFB800] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
