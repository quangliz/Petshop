"use client";
import { Star } from "lucide-react";

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
};

export default function StarRating({ value, onChange, size = 20 }: Props) {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={`transition-colors duration-150 ${onChange ? "cursor-pointer" : "cursor-default"} ${i <= value ? "text-warning-DEFAULT" : "text-neutral-300"}`}
          style={{ color: i <= value ? "oklch(0.75 0.15 75)" : undefined }}
          fill={i <= value ? "currentColor" : "none"}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  );
}
