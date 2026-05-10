"use client";
import React, { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10"
      style={{ background: "radial-gradient(circle at top right, var(--primary-50), transparent), radial-gradient(circle at bottom left, var(--teal-50), transparent)" }}
    >
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white mx-auto mb-5" style={{ background: "var(--primary-600)", boxShadow: "0 8px 16px var(--primary-100)" }}>
            <Mail size={32} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.025em] mb-2">Quên mật khẩu</h1>
          <p className="text-[14px] text-neutral-500">Nhập email để nhận link đặt lại mật khẩu</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="p-4 rounded-[12px] text-[14px] font-semibold mb-6" style={{ background: "var(--primary-50)", color: "var(--primary-700)" }}>
              Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.
            </div>
            <Link href="/login" className="text-[14px] font-bold no-underline inline-flex items-center gap-1.5" style={{ color: "var(--primary-600)" }}>
              <ArrowLeft size={16} /> Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="px-3 py-3 rounded-[10px] text-[13px] text-center font-semibold" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-[13px] font-bold mb-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
                <input
                  type="email"
                  required
                  className="w-full py-3 pl-[42px] pr-4 rounded-[12px] border-[1.5px] border-neutral-200 text-[14px] outline-none"
                  placeholder="pet@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] rounded-[14px] text-[15px] font-semibold text-white transition-opacity disabled:opacity-70"
              style={{ background: "var(--primary-600)" }}
            >
              {loading ? "Đang xử lý..." : "Gửi link đặt lại"}
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
