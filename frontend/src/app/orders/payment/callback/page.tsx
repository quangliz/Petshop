"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

type PaymentState = "loading" | "success" | "failed" | "reconciliation";

function VNPayCallbackContent() {
  const searchParams = useSearchParams();
  const merchantRef = searchParams.get('vnp_TxnRef');
  const [status, setStatus] = useState<PaymentState>(
    merchantRef ? "loading" : "failed"
  );

  useEffect(() => {
    if (!merchantRef) return;

    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      let guestOrderToken: string | null = null;
      try {
        const raw = sessionStorage.getItem(`payment_context:${merchantRef}`);
        guestOrderToken = raw ? JSON.parse(raw).guestOrderToken : null;
      } catch {}

      try {
        const res = await api.get(`/payments/vnpay/status/${merchantRef}`, {
          headers: guestOrderToken ? { 'X-Guest-Order-Token': guestOrderToken } : {},
        });
        if (cancelled) return;
        if (res.data.status === 'success') setStatus('success');
        else if (res.data.status === 'failed') setStatus('failed');
        else if (res.data.status === 'reconciliation') setStatus('reconciliation');
        else if (attempts < 30) window.setTimeout(poll, 2000);
        else setStatus('reconciliation');
      } catch {
        if (!cancelled && attempts < 5) window.setTimeout(poll, 2000);
        else if (!cancelled) setStatus('reconciliation');
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [merchantRef]);

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center px-6 py-[60px]">
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-[480px] px-10 py-12 text-center">
        {status === 'loading' && <>
          <Loader2 size={64} className="mx-auto mb-6 animate-spin" style={{ color: 'var(--primary-500)' }} />
          <h1 className="text-[22px] font-extrabold mb-2">Đang chờ VNPay xác nhận...</h1>
          <p className="text-[14px] text-neutral-500">Bạn có thể giữ nguyên trang này trong giây lát.</p>
        </>}

        {status === 'success' && <>
          <CheckCircle2 size={64} className="mx-auto mb-6" style={{ color: 'var(--success)' }} />
          <h1 className="text-[24px] font-extrabold mb-2" style={{ color: 'var(--success)' }}>Thanh toán thành công!</h1>
          <p className="text-[14px] text-neutral-500 mb-8">Đơn hàng đã được xác nhận thanh toán.</p>
          <div className="flex gap-3">
            <Link href="/shop" className="flex-1 h-12 rounded-[14px] border border-neutral-200 flex items-center justify-center text-sm font-semibold">Mua tiếp</Link>
            <Link href="/orders" className="flex-1 h-12 rounded-[14px] text-white flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--primary-600)' }}>Xem đơn hàng</Link>
          </div>
        </>}

        {status === 'failed' && <>
          <XCircle size={64} className="mx-auto mb-6" style={{ color: 'var(--danger)' }} />
          <h1 className="text-[24px] font-extrabold mb-2">Thanh toán thất bại</h1>
          <p className="text-[14px] text-neutral-500 mb-8">Giao dịch bị hủy hoặc không được VNPay chấp nhận.</p>
          <Link href="/orders" className="w-full h-12 rounded-[14px] border border-neutral-200 flex items-center justify-center text-sm font-semibold">Về lịch sử đơn hàng</Link>
        </>}

        {status === 'reconciliation' && <>
          <AlertTriangle size={64} className="mx-auto mb-6 text-amber-500" />
          <h1 className="text-[24px] font-extrabold mb-2">Đang đối soát giao dịch</h1>
          <p className="text-[14px] text-neutral-500 mb-8">Hệ thống đã nhận thông tin nhưng cần kiểm tra thêm. Vui lòng không thanh toán lại và liên hệ hỗ trợ nếu trạng thái chưa cập nhật.</p>
          <Link href="/tra-cuu-don-hang" className="w-full h-12 rounded-[14px] border border-neutral-200 flex items-center justify-center text-sm font-semibold">Tra cứu đơn hàng</Link>
        </>}
      </div>
    </div>
  );
}

export default function VNPayCallbackPage() {
  return <Suspense><VNPayCallbackContent /></Suspense>;
}
