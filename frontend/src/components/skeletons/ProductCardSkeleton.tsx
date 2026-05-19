import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-neutral-100 rounded-[16px] shadow-xs overflow-hidden flex flex-col h-full", className)}>
      <Skeleton className="aspect-square w-full rounded-none bg-neutral-100" />
      <div className="p-[14px_16px_16px] flex flex-col gap-2 flex-1">
        <Skeleton className="h-3 w-20 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-3 w-24 rounded-full" />
        <div className="mt-auto pt-1.5 flex items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-14 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-9 w-full rounded-[10px]" />
      </div>
    </div>
  );
}

export function ShopPageSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-full" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-full" />
        </div>
        <div className="flex gap-3 justify-end">
          <Skeleton className="h-9 w-20 rounded-[10px] lg:hidden" />
          <Skeleton className="h-[38px] w-40 rounded-[10px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8 items-start">
        <aside className="hidden lg:block">
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
            {[0, 1, 2].map((group) => (
              <div key={group} className="py-4 border-t border-neutral-100 first:border-t-0">
                <Skeleton className="h-3 w-24 rounded-full mb-4" />
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <Skeleton className="h-[18px] w-[18px] rounded-[5px]" />
                      <Skeleton className="h-3 flex-1 rounded-full" />
                      <Skeleton className="h-3 w-6 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
