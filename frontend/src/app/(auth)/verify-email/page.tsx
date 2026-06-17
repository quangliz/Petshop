"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Mail, CheckCircle, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function VerifyEmailSkeleton() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10">
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 md:p-10">
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="w-16 h-16 rounded-[20px] mb-5" />
          <Skeleton className="h-8 w-56 rounded-lg mb-3" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[52px] w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "Đang xác thực tài khoản của bạn..." : "Liên kết kích hoạt thiếu thông tin mã xác thực.");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyToken = async () => {
      try {
        const response = await api.post("/auth/verify-email", { token });
        if (isMounted) {
          setStatus("success");
          setMessage(response.data?.message || "Tài khoản của bạn đã được kích hoạt thành công!");
          toast.success("Kích hoạt tài khoản thành công!");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus("error");
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          setMessage(detail || "Mã kích hoạt không hợp lệ hoặc đã hết hạn.");
          toast.error(detail || "Kích hoạt thất bại.");
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    try {
      const response = await api.post("/auth/resend-verification", { email: resendEmail });
      toast.success(response.data?.message || "Link kích hoạt mới đã được gửi!");
      setResendEmail("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Không thể gửi lại email kích hoạt.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(circle at top right, var(--primary-50), transparent 40%), radial-gradient(circle at bottom left, var(--teal-50), transparent 40%)",
      }}
    >
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 md:p-10 text-center">
        {status === "loading" && (
          <div className="py-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-6" />
            <h1 className="text-[22px] font-extrabold mb-3">Đang xác thực</h1>
            <p className="text-[14px] text-neutral-500">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white mx-auto mb-6"
              style={{
                background: "var(--primary-600)",
                boxShadow: "0 8px 16px var(--primary-100)",
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h1 className="text-[24px] font-extrabold tracking-[-0.02em] mb-3">Xác thực thành công</h1>
            <p className="text-[14px] text-neutral-500 mb-8">{message}</p>

            <Link
              href="/login"
              className="w-full h-[52px] rounded-[14px] text-[15px] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity no-underline"
              style={{ background: "var(--primary-600)" }}
            >
              Đăng nhập ngay <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {status === "error" && (
          <div>
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white mx-auto mb-6"
              style={{
                background: "var(--danger)",
                boxShadow: "0 8px 16px var(--danger-bg)",
              }}
            >
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-[24px] font-extrabold tracking-[-0.02em] mb-3">Kích hoạt thất bại</h1>
            <p className="text-[14px] text-neutral-500 mb-8">{message}</p>

            <div className="border-t border-neutral-100 pt-6 mt-2 text-left">
              <h2 className="text-[14px] font-bold mb-3 text-neutral-800">Yêu cầu gửi lại link kích hoạt mới</h2>
              <form onSubmit={handleResend} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-[12px] border border-neutral-200 text-[14px] outline-none focus:border-primary-600 transition-colors"
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="px-4 py-2.5 rounded-[12px] text-[13px] font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-70 flex items-center justify-center"
                >
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gửi lại"}
                </button>
              </form>
            </div>

            <div className="mt-8 text-[14px]">
              <Link href="/login" className="font-bold no-underline text-neutral-500 hover:text-neutral-800">
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
