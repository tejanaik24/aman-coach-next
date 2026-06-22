import { PageSkeleton } from "@/components/ui/skeleton"

export default function ClientLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <PageSkeleton />
    </div>
  )
}
