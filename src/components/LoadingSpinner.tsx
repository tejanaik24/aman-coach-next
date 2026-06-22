import { cn } from "@/lib/utils"

const sizeMap = {
  sm: "size-4 border-2",
  md: "size-8 border-2",
  lg: "size-12 border-3",
}

export function LoadingSpinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "rounded-full border-zinc-700 border-t-[#FFB800] animate-spin",
          sizeMap[size]
        )}
      />
    </div>
  )
}
