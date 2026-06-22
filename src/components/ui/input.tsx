import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
