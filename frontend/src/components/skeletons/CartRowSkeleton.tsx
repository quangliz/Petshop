import { Skeleton } from "@/components/ui/skeleton";

export function CartRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-neutral-100">
      <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
      <Skeleton className="h-[100px] w-[100px] rounded-xl flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>
  );
}
