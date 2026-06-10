"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import StarRating from "./StarRating";
import { Skeleton } from "@/components/ui/skeleton";

type Review = {
  id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function ReviewList({ productId }: { productId: string }) {
  const [page, setPage] = useState(1);
  const size = 5;

  const { data, isLoading } = useQuery<{ items: Review[]; total: number }>({
    queryKey: ["reviews", productId, page],
    queryFn: () => api.get(`/products/${productId}/reviews`, { params: { page, size } }).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, item) => (
          <div key={item} className="py-4 border-b border-neutral-100">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </div>
              <Skeleton className="ml-auto h-4 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-4/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!data || data.items.length === 0) return null;

  const totalPages = Math.ceil(data.total / size);

  return (
    <div className="flex flex-col gap-4">
      {data.items.map((r) => (
        <div key={r.id} className="py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-[oklch(0.93_0.06_55)] flex items-center justify-center text-[14px] font-bold text-[oklch(0.61_0.19_46)]">
              {r.user_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-neutral-900">{r.user_name}</div>
              <div className="text-[12px] text-neutral-400">
                {new Date(r.created_at).toLocaleDateString("vi-VN")}
              </div>
            </div>
            <div className="ml-auto">
              <StarRating value={r.rating} size={14} />
            </div>
          </div>
          {r.comment && (
            <p className="m-0 text-[14px] text-neutral-900 font-medium leading-[1.6]">{r.comment}</p>
          )}
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-[8px] border-[1.5px] border-neutral-200 text-[13px] font-semibold cursor-pointer transition-colors duration-150 ${
                p === page
                  ? "bg-[oklch(0.68_0.19_50)] text-white border-[oklch(0.68_0.19_50)]"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
