import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-neutral-100 before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.45s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent motion-reduce:before:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
