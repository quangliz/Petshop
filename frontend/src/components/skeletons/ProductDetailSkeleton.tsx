import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
