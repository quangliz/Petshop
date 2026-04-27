"use client";
import { Star } from "lucide-react";

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
};

export default function StarRating({ value, onChange, size = 20 }: Props) {
  return (
    <div style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          style={{
            cursor: onChange ? "pointer" : "default",
            color: i <= value ? "oklch(0.75 0.15 75)" : "var(--neutral-300)",
            transition: "color 0.15s",
          }}
          fill={i <= value ? "currentColor" : "none"}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  );
}
