"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import RatingSummary from "./RatingSummary";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";

export default function ReviewSection({ productId }: { productId: string }) {
  const { user } = useAuthStore();

  const { data: canReviewData } = useQuery({
    queryKey: ["can-review", productId],
    queryFn: () => api.get(`/products/${productId}/can-review`).then((r) => r.data),
    enabled: !!user,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <RatingSummary productId={productId} />
      {user && canReviewData?.can_review && <ReviewForm productId={productId} />}
      {user && canReviewData && !canReviewData.can_review && canReviewData.existing_review && (
        <p style={{ fontSize: 13, color: "var(--neutral-500)", fontStyle: "italic" }}>
          Bạn đã đánh giá sản phẩm này ({canReviewData.existing_review.rating}/5 sao).
        </p>
      )}
      <ReviewList productId={productId} />
    </div>
  );
}
