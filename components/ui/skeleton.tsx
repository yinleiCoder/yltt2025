import { cn } from "@/lib/utils"

function Skeleton({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative isolate overflow-hidden rounded-md bg-muted", className)}
      {...props}
    >
      <span aria-hidden className="animate-shimmer pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      {children}
    </div>
  )
}

export { Skeleton }
