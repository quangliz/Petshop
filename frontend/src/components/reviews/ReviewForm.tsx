"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import StarRating from "./StarRating";

export default function ReviewForm({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post(`/products/${productId}/reviews`, { rating, comment: comment.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["rating-summary", productId] });
      queryClient.invalidateQueries({ queryKey: ["can-review", productId] });
      setRating(0);
      setComment("");
    },
  });

  return (
    <div style={{ padding: "24px", background: "var(--neutral-50)", borderRadius: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Viết đánh giá</h4>
      <div>
        <div style={{ fontSize: 13, color: "var(--neutral-600)", marginBottom: 6 }}>Đánh giá của bạn</div>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
        rows={3}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12,
          border: "1.5px solid var(--neutral-200)", fontSize: 14,
          resize: "vertical", fontFamily: "inherit",
        }}
      />
      {mutation.isError && (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>
          {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Có lỗi xảy ra"}
        </p>
      )}
      <button
        onClick={() => mutation.mutate()}
        disabled={rating === 0 || mutation.isPending}
        className="btn btn-primary"
        style={{ alignSelf: "flex-start", borderRadius: 12, padding: "10px 24px" }}
      >
        {mutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </div>
  );
}
