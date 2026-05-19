import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CartRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-neutral-100 rounded-[20px] shadow-sm p-3 md:p-5 flex gap-3 items-center", className)}>
      <Skeleton className="h-[18px] w-[18px] rounded shrink-0" />
      <Skeleton className="h-[70px] w-[70px] md:h-[100px] md:w-[100px] rounded-[12px] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full max-w-[240px]" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 pb-[280px] md:pb-8 md:py-8">
      <div className="flex items-center gap-2 mb-6 md:mb-8">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 px-1">
            <Skeleton className="h-[18px] w-[18px] rounded" />
            <Skeleton className="h-4 w-40 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <CartRowSkeleton key={i} />
          ))}
        </div>

        <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 lg:sticky lg:top-24">
          <Skeleton className="h-5 w-32 mb-5 rounded-full" />
          <div className="space-y-3 pb-5 border-b border-neutral-100">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex justify-between items-baseline pt-5">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-12 w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}
