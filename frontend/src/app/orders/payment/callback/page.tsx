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
        if (responseCode === '00') {
           setStatus("success");
        } else {
           setStatus("error");
        }
      } catch (err) {
        console.error("Payment verify error:", err);
        setStatus("error");
      }
    };

    if (searchParams.toString()) {
        notifyIPN();
    }
  }, [searchParams]);

  return (
    <div style={{
      minHeight: 'calc(100vh - 300px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px'
    }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: '48px 40px', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Loader2 size={64} style={{ color: 'var(--primary-500)', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Đang xác minh thanh toán...</h1>
            <p style={{ fontSize: 14, color: 'var(--neutral-500)' }}>Vui lòng chờ trong giây lát</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle2 size={44} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)', margin: '0 0 8px' }}>Thanh toán thành công!</h1>
            <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 32 }}>Chân thành cảm ơn bạn đã đặt hàng. Đơn hàng đang được xử lý.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href="/shop" className="btn btn-outline" style={{ flex: 1, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Mua tiếp</Link>
              <Link href="/orders" className="btn btn-primary" style={{ flex: 1, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Xem đơn hàng</Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--danger-bg)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <XCircle size={44} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)', margin: '0 0 8px' }}>Thanh toán thất bại</h1>
            <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 32 }}>Có lỗi xảy ra hoặc bạn đã hủy giao dịch.</p>
            <Link href="/orders" className="btn btn-outline" style={{ width: '100%', height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Về lịch sử đơn hàng</Link>
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
