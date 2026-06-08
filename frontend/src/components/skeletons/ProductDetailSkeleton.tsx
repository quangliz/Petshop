import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-28 md:pb-8">
      {/* Breadcrumb */}
      <div className="hidden md:flex flex-wrap items-center gap-2 mb-6 md:mb-8">
        <Skeleton className="h-3.5 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-3 rounded-full" />
        <Skeleton className="h-3.5 w-20 rounded-full" />
        <Skeleton className="h-3.5 w-3 rounded-full" />
        <Skeleton className="h-3.5 w-40 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
        {/* Gallery */}
        <div className="relative md:sticky md:top-24">
          <Skeleton className="aspect-square w-full rounded-[20px] border border-neutral-100 shadow-sm" />
        </div>

        {/* Info Panel */}
        <div className="flex flex-col gap-5">
          {/* Price Box Skeleton */}
          <div className="py-3 px-4 rounded-[12px] border border-red-100/60 bg-red-50/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-16 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-full" />
            </div>
          </div>

          {/* Title block */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5.5 w-24 rounded-[6px]" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4 rounded-lg" />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="fixed bottom-0 inset-x-0 h-[56px] bg-white z-50 border-t border-neutral-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] md:relative md:bottom-auto md:p-0 md:bg-transparent md:z-auto md:border-none md:shadow-none md:mt-2 md:h-auto">
            <div className="flex items-stretch h-full md:h-[50px] md:items-center md:gap-3">
              {/* Mobile placeholders */}
              <div className="flex md:hidden w-[64px] h-full items-center justify-center border-r border-neutral-100 shrink-0">
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <div className="flex md:hidden w-[76px] h-full items-center justify-center border-r border-neutral-100 shrink-0">
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <div className="flex md:hidden flex-1 h-full items-center justify-center px-4">
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
              
              {/* Desktop placeholders */}
              <Skeleton className="hidden md:block h-[50px] w-[180px] rounded-[12px]" />
              <Skeleton className="hidden md:block h-[50px] flex-1 rounded-[12px]" />
            </div>
          </div>

          {/* Minimalist Shipping and Trust info */}
          <div className="flex flex-col gap-2.5 mt-3 px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3.5 w-56 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3.5 w-60 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 md:gap-8 mt-12 md:mt-16 border-b border-neutral-200">
        <Skeleton className="h-12 w-24 rounded-t-lg" />
        <Skeleton className="h-12 w-28 rounded-t-lg" />
      </div>
      
      {/* Tab content */}
      <div className="py-8 max-w-[800px] space-y-3">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-11/12 rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-full" />
      </div>
    </div>
  );
}
