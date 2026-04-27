"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getGuestCart, clearGuestCart } from "@/lib/guestCart";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/auth/google/callback`
    : "http://localhost:3000/auth/google/callback";

function buildGoogleUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export default function GoogleAuthButton({ label = "Tiếp tục với Google" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert("Google OAuth chưa được cấu hình.");
      return;
    }
    setLoading(true);
    window.location.href = buildGoogleUrl();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        width: "100%", height: 52, borderRadius: 14, fontSize: 15, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        background: "white", border: "1.5px solid var(--neutral-200)",
        cursor: loading ? "not-allowed" : "pointer", color: "var(--neutral-800)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--neutral-300)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = "var(--neutral-200)"; }}
    >
      {/* Google "G" logo */}
      <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      {loading ? "Đang chuyển hướng..." : label}
    </button>
  );
}
