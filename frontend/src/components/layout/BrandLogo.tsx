export default function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Paw pad */}
      <circle cx="22" cy="18" r="6" fill="var(--teal-500)" opacity="0.7" />
      <circle cx="42" cy="18" r="6" fill="var(--teal-500)" opacity="0.7" />
      <circle cx="13" cy="30" r="5.5" fill="var(--teal-500)" opacity="0.7" />
      <circle cx="51" cy="30" r="5.5" fill="var(--teal-500)" opacity="0.7" />
      {/* Main pad */}
      <ellipse cx="32" cy="42" rx="16" ry="14" fill="var(--teal-600)" />
      {/* Shine */}
      <ellipse cx="28" cy="38" rx="5" ry="4" fill="var(--teal-400)" opacity="0.35" />
    </svg>
  );
}
