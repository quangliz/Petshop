import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const cellWidths = ["w-28", "w-44", "w-24", "w-20", "w-32", "w-24", "w-20"];

export function AdminTableRowsSkeleton({
  rows = 5,
  columns,
  imageColumn = false,
  actionColumn = true,
}: {
  rows?: number;
  columns: number;
  imageColumn?: boolean;
  actionColumn?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }).map((__, column) => (
            <td key={column} className={cn("px-4 py-3", column > 1 && "text-center")}>
              {imageColumn && column === 0 ? (
                <Skeleton className="h-12 w-12 rounded-lg" />
              ) : actionColumn && column === columns - 1 ? (
                <div className="flex justify-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ) : (
                <div className={cn("flex flex-col gap-2", column > 1 && "items-center")}>
                  <Skeleton className={cn("h-4 rounded-full", cellWidths[column % cellWidths.length])} />
                  {column === 1 && <Skeleton className="h-3 w-32 rounded-full" />}
                </div>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, item) => (
          <div key={item} className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-gray-200 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white rounded-xl p-5 shadow-sm">
          <Skeleton className="h-5 w-48 mb-6 rounded-full" />
          <div className="h-[260px] flex items-end gap-3">
            {Array.from({ length: 14 }).map((_, item) => (
              <Skeleton
                key={item}
                className="flex-1 rounded-t-md"
                style={{ height: `${48 + ((item * 17) % 58)}%` }}
              />
            ))}
          </div>
        </div>
        <div className="xl:col-span-2 bg-white rounded-xl p-5 shadow-sm">
          <Skeleton className="h-5 w-44 mb-6 rounded-full" />
          <div className="h-[260px] flex flex-col justify-end gap-4">
            {Array.from({ length: 5 }).map((_, item) => (
              <div key={item} className="flex items-center gap-3">
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-7 rounded-r-md" style={{ width: `${42 + item * 11}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmbeddingItemsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, item) => (
        <div key={item} className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <Skeleton className="h-6 w-44 rounded" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="space-y-2 mb-3">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-5/6 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
