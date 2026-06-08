import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-purple/20 text-purple-light",
        success: "bg-green-500/20 text-green-400",
        warning: "bg-yellow-500/20 text-yellow-400",
        danger: "bg-red-500/20 text-red-400",
        info: "bg-blue-500/20 text-blue-400",
        outline: "border border-zinc-700 text-zinc-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
