import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-28 md:pb-8">
      <div className="flex flex-wrap items-center gap-2 mb-6 md:mb-8">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-40 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
        <div className="relative md:sticky md:top-24">
          <Skeleton className="aspect-square w-full rounded-[20px] border border-neutral-100 shadow-sm" />
        </div>

        <div className="flex flex-col gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-24 rounded-[6px]" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-3/4 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-40 rounded-full" />
          </div>

          <div className="p-6 rounded-[20px] border border-neutral-100 bg-white">
            <Skeleton className="h-9 w-44 rounded-full" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-4 w-28 rounded-full" />
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-11 w-24 rounded-[8px]" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1].map((item) => (
              <div key={item} className="px-4 py-3 rounded-[12px] border border-neutral-100 bg-white space-y-2">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-full" />
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 inset-x-0 p-5 bg-white z-50 rounded-t-[24px] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] md:relative md:bottom-auto md:p-0 md:bg-transparent md:z-auto flex flex-col gap-3 md:gap-4 md:mt-4 md:pt-4 md:border-t md:border-neutral-100 md:rounded-none md:shadow-none">
            <div className="flex items-center gap-3 md:gap-4">
              <Skeleton className="h-[52px] w-[128px] rounded-[14px]" />
              <Skeleton className="h-[52px] flex-1 rounded-[14px]" />
            </div>
            <Skeleton className="h-[52px] w-full rounded-[14px]" />
          </div>

          <div className="flex flex-wrap gap-3 md:gap-4 mt-2">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-4 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 md:gap-8 mt-12 md:mt-16 border-b border-neutral-200">
        <Skeleton className="h-12 w-24 rounded-t-lg" />
        <Skeleton className="h-12 w-28 rounded-t-lg" />
      </div>
      <div className="py-8 max-w-[800px] space-y-3">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-11/12 rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-full" />
      </div>
    </div>
  );
}
