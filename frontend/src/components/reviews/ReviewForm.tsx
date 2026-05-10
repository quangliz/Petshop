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
    <div className="p-6 bg-neutral-50 rounded-[16px] flex flex-col gap-4">
      <h4 className="text-[16px] font-bold m-0">Viết đánh giá</h4>
      <div>
        <div className="text-[13px] text-neutral-600 mb-1.5">Đánh giá của bạn</div>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
        rows={3}
        className="w-full px-4 py-3 rounded-[12px] border-[1.5px] border-neutral-200 text-[14px] resize-y font-[inherit] outline-none focus:border-neutral-400 transition-colors"
      />
      {mutation.isError && (
        <p className="text-[13px] font-semibold m-0" style={{ color: "var(--danger)" }}>
          {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Có lỗi xảy ra"}
        </p>
      )}
      <button
        onClick={() => mutation.mutate()}
        disabled={rating === 0 || mutation.isPending}
        className="self-start px-6 py-2.5 rounded-[12px] text-[14px] font-semibold text-white transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--primary-600)" }}
      >
        {mutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </div>
  );
}
