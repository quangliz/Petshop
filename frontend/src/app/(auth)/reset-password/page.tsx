"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Token không hợp lệ hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10">
        <div className="card w-full max-w-md mx-auto p-8 text-center">
          <p style={{ color: "var(--danger)", fontWeight: 600 }}>Link không hợp lệ.</p>
          <Link href="/forgot-password" style={{ fontWeight: 700, color: "var(--primary-600)", textDecoration: "none" }}>
            Yêu cầu link mới
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(circle at top right, var(--primary-50), transparent), radial-gradient(circle at bottom left, var(--teal-50), transparent)",
      }}
    >
      <div className="card w-full max-w-md mx-auto p-8 md:p-10">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: "var(--primary-600)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", boxShadow: "0 8px 16px var(--primary-100)",
            }}
          >
            <Lock size={32} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 8px" }}>
            Đặt lại mật khẩu
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-500)" }}>Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {success ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle size={48} style={{ color: "var(--primary-600)", margin: "0 auto 16px" }} />
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Mật khẩu đã được cập nhật!</p>
            <p style={{ fontSize: 13, color: "var(--neutral-500)" }}>Đang chuyển hướng đến trang đăng nhập...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {error && (
              <div
                style={{
                  padding: 12, background: "var(--danger-bg)", color: "var(--danger)",
                  borderRadius: 10, fontSize: 13, textAlign: "center", fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Mật khẩu mới</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: 14, top: 15, color: "var(--neutral-400)" }} />
                <input
                  type="password" required
                  style={{
                    width: "100%", padding: "12px 16px 12px 42px",
                    borderRadius: 12, border: "1.5px solid var(--neutral-200)", outline: "none",
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Xác nhận mật khẩu</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: 14, top: 15, color: "var(--neutral-400)" }} />
                <input
                  type="password" required
                  style={{
                    width: "100%", padding: "12px 16px 12px 42px",
                    borderRadius: 12, border: "1.5px solid var(--neutral-200)", outline: "none",
                  }}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: "100%", height: 52, borderRadius: 14, fontSize: 15 }}
            >
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
            <div style={{ textAlign: "center", fontSize: 14 }}>
              <Link
                href="/login"
                style={{
                  fontWeight: 700, color: "var(--primary-600)",
                  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <ArrowLeft size={16} /> Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
