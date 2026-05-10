"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import StarRating from "./StarRating";

type Summary = {
  average: number;
  total: number;
  distribution: Record<string, number>;
};

export default function RatingSummary({ productId }: { productId: string }) {
  const { data } = useQuery<Summary>({
    queryKey: ["rating-summary", productId],
    queryFn: () => api.get(`/products/${productId}/rating-summary`).then((r) => r.data),
  });

  if (!data || data.total === 0) {
    return (
      <p className="text-neutral-500 text-center py-6">
        Chưa có đánh giá nào cho sản phẩm này.
      </p>
    );
  }

  return (
    <div className="flex gap-10 items-center py-4">
      <div className="text-center min-w-[120px]">
        <div className="text-[48px] font-extrabold text-neutral-900 leading-none">{data.average}</div>
        <StarRating value={Math.round(data.average)} size={18} />
        <div className="text-[13px] text-neutral-500 mt-1">{data.total} đánh giá</div>
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = data.distribution[String(star)] || 0;
          const pct = data.total > 0 ? (count / data.total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-[13px]">
              <span className="w-5 text-right text-neutral-600 font-semibold">{star}</span>
              <StarRating value={star} size={12} />
              <div className="flex-1 h-2 bg-neutral-100 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-[width] duration-300"
                  style={{ width: `${pct}%`, background: "oklch(0.75 0.15 75)" }}
                />
              </div>
              <span className="w-7 text-[12px] text-neutral-500">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
