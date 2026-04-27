export default function CatbotLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ears */}
      <path d="M12 28L8 6C8 6 20 14 22 24" fill="currentColor" opacity="0.3" />
      <path d="M52 28L56 6C56 6 44 14 42 24" fill="currentColor" opacity="0.3" />
      {/* Head */}
      <ellipse cx="32" cy="36" rx="22" ry="20" fill="currentColor" opacity="0.15" />
      {/* Eyes */}
      <ellipse cx="23" cy="33" rx="3.5" ry="4" fill="currentColor" />
      <ellipse cx="41" cy="33" rx="3.5" ry="4" fill="currentColor" />
      <ellipse cx="24" cy="32" rx="1.2" ry="1.5" fill="white" />
      <ellipse cx="42" cy="32" rx="1.2" ry="1.5" fill="white" />
      {/* Nose */}
      <path d="M30 40L32 42L34 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Mouth */}
      <path d="M32 42C32 42 28 46 26 45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M32 42C32 42 36 46 38 45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Whiskers */}
      <line x1="4" y1="36" x2="18" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="5" y1="42" x2="18" y2="41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="46" y1="38" x2="60" y2="36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="46" y1="41" x2="59" y2="42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
