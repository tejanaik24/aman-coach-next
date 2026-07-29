"use client"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon = "📭", title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <span className="text-4xl mb-4">{icon}</span>
      <p className="font-heading text-xl text-white mb-2">{title}</p>
      {description && (
        <p className="text-sm text-zinc-500 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-full bg-[#FF6A1A] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-black hover:bg-[#C2470A] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
