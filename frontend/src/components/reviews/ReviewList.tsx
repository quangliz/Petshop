"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import StarRating from "./StarRating";

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

  if (isLoading) return <p style={{ color: "var(--neutral-500)", padding: "16px 0" }}>Đang tải...</p>;
  if (!data || data.items.length === 0) return null;

  const totalPages = Math.ceil(data.total / size);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.items.map((r) => (
        <div key={r.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--neutral-100)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--primary-100)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "var(--primary-600)",
            }}>
              {r.user_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>{r.user_name}</div>
              <div style={{ fontSize: 12, color: "var(--neutral-400)" }}>
                {new Date(r.created_at).toLocaleDateString("vi-VN")}
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <StarRating value={r.rating} size={14} />
            </div>
          </div>
          {r.comment && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--neutral-700)", lineHeight: 1.6 }}>{r.comment}</p>
          )}
        </div>
      ))}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, paddingTop: 8 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--neutral-200)",
                background: p === page ? "var(--primary-500)" : "white",
                color: p === page ? "white" : "var(--neutral-600)",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
