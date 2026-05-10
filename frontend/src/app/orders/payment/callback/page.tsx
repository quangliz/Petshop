"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VNPayCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const notifyIPN = async () => {
      try {
        const queryStr = searchParams.toString();
        await api.get(`/payments/vnpay/ipn?${queryStr}`);
        const responseCode = searchParams.get('vnp_ResponseCode');
        if (responseCode === '00') { setStatus("success"); } else { setStatus("error"); }
      } catch (err) {
        console.error("Payment verify error:", err);
        setStatus("error");
      }
    };
    if (searchParams.toString()) notifyIPN();
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-6 py-[60px]">
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-[480px] px-10 py-12 text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={64} className="mx-auto mb-6 animate-spin" style={{ color: 'var(--primary-500)' }} />
            <h1 className="text-[22px] font-extrabold mb-2">Đang xác minh thanh toán...</h1>
            <p className="text-[14px] text-neutral-500">Vui lòng chờ trong giây lát</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <CheckCircle2 size={44} />
            </div>
            <h1 className="text-[24px] font-extrabold mb-2" style={{ color: 'var(--success)' }}>Thanh toán thành công!</h1>
            <p className="text-[14px] text-neutral-500 mb-8">Chân thành cảm ơn bạn đã đặt hàng. Đơn hàng đang được xử lý.</p>
            <div className="flex gap-3">
              <Link
                href="/shop"
                className="flex-1 h-12 rounded-[14px] border-[1.5px] border-neutral-200 bg-white text-neutral-700 flex items-center justify-center text-[14px] font-semibold hover:bg-neutral-50 transition-colors no-underline"
              >
                Mua tiếp
              </Link>
              <Link
                href="/orders"
                className="flex-1 h-12 rounded-[14px] text-white flex items-center justify-center text-[14px] font-semibold no-underline transition-opacity hover:opacity-90"
                style={{ background: 'var(--primary-600)' }}
              >
                Xem đơn hàng
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <XCircle size={44} />
            </div>
            <h1 className="text-[24px] font-extrabold mb-2" style={{ color: 'var(--danger)' }}>Thanh toán thất bại</h1>
            <p className="text-[14px] text-neutral-500 mb-8">Có lỗi xảy ra hoặc bạn đã hủy giao dịch.</p>
            <Link
              href="/orders"
              className="w-full h-12 rounded-[14px] border-[1.5px] border-neutral-200 bg-white text-neutral-700 flex items-center justify-center text-[14px] font-semibold hover:bg-neutral-50 transition-colors no-underline"
            >
              Về lịch sử đơn hàng
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VNPayCallbackPage() {
  return (
    <Suspense>
      <VNPayCallbackContent />
    </Suspense>
  );
}
