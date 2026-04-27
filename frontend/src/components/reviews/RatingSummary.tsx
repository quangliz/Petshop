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
      <p style={{ color: "var(--neutral-500)", textAlign: "center", padding: "24px 0" }}>
        Chưa có đánh giá nào cho sản phẩm này.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: 40, alignItems: "center", padding: "16px 0" }}>
      <div style={{ textAlign: "center", minWidth: 120 }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: "var(--neutral-900)", lineHeight: 1 }}>
          {data.average}
        </div>
        <StarRating value={Math.round(data.average)} size={18} />
        <div style={{ fontSize: 13, color: "var(--neutral-500)", marginTop: 4 }}>
          {data.total} đánh giá
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = data.distribution[String(star)] || 0;
          const pct = data.total > 0 ? (count / data.total) * 100 : 0;
          return (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ width: 20, textAlign: "right", color: "var(--neutral-600)", fontWeight: 600 }}>{star}</span>
              <StarRating value={star} size={12} />
              <div style={{ flex: 1, height: 8, background: "var(--neutral-100)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "oklch(0.75 0.15 75)", borderRadius: 4, transition: "width 0.3s" }} />
              </div>
              <span style={{ width: 28, fontSize: 12, color: "var(--neutral-500)" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
