import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-24 mt-1" />
      </div>
    </div>
  );
}
