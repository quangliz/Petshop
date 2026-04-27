"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getGuestCart, clearGuestCart } from "@/lib/guestCart";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang tải...</p>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");
  const hasHandled = React.useRef(false);

  useEffect(() => {
    if (hasHandled.current) return;
    hasHandled.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setTimeout(() => setError("Đăng nhập Google bị huỷ."), 0);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }

    if (!code) {
      setTimeout(() => setError("Không nhận được mã xác thực từ Google."), 0);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;

    api
      .post("/auth/google", { code, redirect_uri: redirectUri })
      .then(async (res) => {
        const token = res.data.access_token;
        const userRes = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAuth(userRes.data, token);

        const guestCart = getGuestCart();
        if (guestCart.length > 0) {
          for (const item of guestCart) {
            try {
              await api.post("/cart/items", item, {
                headers: { Authorization: `Bearer ${token}` },
              });
            } catch {}
          }
          clearGuestCart();
        }

        router.push("/");
      })
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        const detail = axiosErr?.response?.data?.detail;
        setError(detail || "Đăng nhập thất bại. Vui lòng thử lại.");
        setTimeout(() => router.push("/login"), 3000);
      });
  }, [searchParams, router, setAuth]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(circle at top right, var(--primary-50), transparent)" }}
    >
      <div className="card p-10 text-center" style={{ maxWidth: 360 }}>
        {error ? (
          <>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--danger)", marginBottom: 8 }}>{error}</p>
            <p style={{ fontSize: 13, color: "var(--neutral-500)" }}>Đang chuyển về trang đăng nhập...</p>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Đang xác thực...</p>
            <p style={{ fontSize: 13, color: "var(--neutral-500)" }}>Vui lòng chờ trong giây lát</p>
          </>
        )}
      </div>
    </div>
  );
}
