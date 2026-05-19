import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function OrderRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-neutral-100 rounded-[20px] shadow-sm px-4 py-4 sm:px-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Skeleton className="hidden sm:block h-6 w-24 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center gap-2 mb-6 sm:mb-8">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-28 rounded-full" />
      </div>
      <Skeleton className="h-8 w-56 mb-6 rounded-lg" />
      <div className="flex flex-col gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-2 mb-6 sm:mb-8">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-28 rounded-full" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-4 w-36 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {[0, 1].map((card) => (
          <div key={card} className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <Skeleton className="h-4 w-2/3 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex justify-between items-center gap-4 py-3 border-b border-neutral-100 last:border-b-0">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full max-w-[280px] rounded-full" />
                <Skeleton className="h-3 w-28 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
          <div className="flex justify-between"><Skeleton className="h-4 w-20 rounded-full" /><Skeleton className="h-4 w-24 rounded-full" /></div>
          <div className="flex justify-between"><Skeleton className="h-4 w-28 rounded-full" /><Skeleton className="h-4 w-20 rounded-full" /></div>
          <div className="flex justify-between pt-3 border-t border-neutral-100"><Skeleton className="h-5 w-24 rounded-full" /><Skeleton className="h-7 w-32 rounded-full" /></div>
        </div>
      </div>
    </div>
  );
}
