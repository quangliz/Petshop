"use client";

/**
 * BrandLogo component
 * Simplified to display only the brand text "thepawsome".
 */
export default function BrandLogo({ 
  size = 40, 
  className = ""
}: { 
  size?: number; 
  className?: string;
  /** @deprecated layout is no longer used as text-only logo is always horizontal */
  layout?: "horizontal" | "vertical";
}) {
  // Horizontal Layout: Text only
  // "thepawsome" has an aspect ratio of approximately 3.1:1 based on the font
  const aspectRatio = 155 / 50; 
  const w = Math.round(size * aspectRatio);
  
  return (
    <svg
      width={w}
      height={size}
      viewBox="0 0 155 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
      className={className}
    >
      <text
        x="0"
        y="50%"
        dominantBaseline="central"
        fontFamily="'GoodPawoo', sans-serif"
        fontSize="32"
        fontWeight="bold"
        fill="currentColor"
        style={{ letterSpacing: '0.02em' }}
      >
        thepawsome
      </text>
    </svg>
  );
}

