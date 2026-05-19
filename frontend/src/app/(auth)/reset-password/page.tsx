"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function ResetPasswordSkeleton() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10">
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 md:p-10">
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="w-16 h-16 rounded-[20px] mb-5" />
          <Skeleton className="h-8 w-56 rounded-lg mb-3" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-[50px] w-full rounded-[12px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="h-[50px] w-full rounded-[12px]" />
          </div>
          <Skeleton className="h-[52px] w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
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
    if (password !== confirm) { setError("Mật khẩu xác nhận không khớp"); return; }
    if (password.length < 6) { setError("Mật khẩu phải có ít nhất 6 ký tự"); return; }
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
        <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 text-center">
          <p className="font-semibold" style={{ color: "var(--danger)" }}>Link không hợp lệ.</p>
          <Link href="/forgot-password" className="font-bold no-underline" style={{ color: "var(--primary-600)" }}>Yêu cầu link mới</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10"
      style={{ background: "radial-gradient(circle at top right, var(--primary-50), transparent), radial-gradient(circle at bottom left, var(--teal-50), transparent)" }}
    >
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white mx-auto mb-5" style={{ background: "var(--primary-600)", boxShadow: "0 8px 16px var(--primary-100)" }}>
            <Lock size={32} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.025em] mb-2">Đặt lại mật khẩu</h1>
          <p className="text-[14px] text-neutral-500">Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {success ? (
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "var(--primary-600)" }} />
            <p className="font-semibold text-[16px] mb-2">Mật khẩu đã được cập nhật!</p>
            <p className="text-[13px] text-neutral-500">Đang chuyển hướng đến trang đăng nhập...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="px-3 py-3 rounded-[10px] text-[13px] text-center font-semibold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-[13px] font-bold mb-2">Mật khẩu mới</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
                <input
                  type="password" required
                  className="w-full py-3 pl-[42px] pr-4 rounded-[12px] border-[1.5px] border-neutral-200 text-[14px] outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold mb-2">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
                <input
                  type="password" required
                  className="w-full py-3 pl-[42px] pr-4 rounded-[12px] border-[1.5px] border-neutral-200 text-[14px] outline-none"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] rounded-[14px] text-[15px] font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ background: "var(--primary-600)" }}
            >
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
            <div className="text-center text-[14px]">
              <Link href="/login" className="font-bold no-underline inline-flex items-center gap-1.5" style={{ color: "var(--primary-600)" }}>
                <ArrowLeft size={16} /> Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
