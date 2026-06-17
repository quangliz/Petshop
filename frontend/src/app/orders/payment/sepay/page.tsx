"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Copy, Check, ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';

type PaymentState = "loading" | "success" | "failed" | "reconciliation" | "processing";

function SePayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantRef = searchParams.get('ref'); // order code

  const [status, setStatus] = useState<PaymentState>(
    merchantRef ? "loading" : "failed"
  );
  const [amount, setAmount] = useState<number>(0);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 minutes countdown
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parse details from payment_url to show text instructions
  const bankDetails = (() => {
    if (!paymentUrl) {
      return { acc: '', bank: '', accName: '', amount: '', des: '' };
    }
    try {
      const urlObj = new URL(paymentUrl);
      return {
        acc: urlObj.searchParams.get('acc') || '',
        bank: urlObj.searchParams.get('bank') || '',
        accName: urlObj.searchParams.get('acc_name') || '',
        amount: urlObj.searchParams.get('amount') || '',
        des: urlObj.searchParams.get('des') || '',
      };
    } catch {
      return { acc: '', bank: '', accName: '', amount: '', des: '' };
    }
  })();

  // Countdown timer
  useEffect(() => {
    if (status !== 'processing' && status !== 'loading') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Poll status
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
        const res = await api.get(`/payments/sepay/status/${merchantRef}`, {
          headers: guestOrderToken ? { 'X-Guest-Order-Token': guestOrderToken } : {},
        });
        if (cancelled) return;

        setAmount(res.data.amount);
        setOrderId(res.data.order_id);
        if (res.data.payment_url) {
          setPaymentUrl(res.data.payment_url);
        }

        if (res.data.status === 'success') {
          setStatus('success');
          toast.success("Thanh toán thành công!");
          // Wait 3 seconds and redirect to order page
          setTimeout(() => {
            const raw = sessionStorage.getItem(`payment_context:${merchantRef}`);
            const isGuest = raw ? !JSON.parse(raw).guestOrderToken : false;
            if (isGuest) {
              router.push('/tra-cuu-don-hang');
            } else {
              router.push(`/orders/${res.data.order_id}`);
            }
          }, 3000);
        } else if (res.data.status === 'failed') {
          setStatus('failed');
        } else if (res.data.status === 'reconciliation') {
          setStatus('reconciliation');
        } else {
          setStatus('processing');
          if (attempts < 300) { // Poll for up to 10 minutes
            window.setTimeout(poll, 2000);
          } else {
            setStatus('reconciliation');
          }
        }
      } catch {
        if (!cancelled && attempts < 5) {
          window.setTimeout(poll, 2000);
        } else if (!cancelled) {
          setStatus('reconciliation');
        }
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [merchantRef, router]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Đã sao chép ${field}`);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 py-10 px-4 flex flex-col items-center justify-center">
      {/* Back button */}
      <div className="w-full max-w-[850px] mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-semibold"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      <div className="bg-white border border-neutral-100 rounded-[24px] shadow-sm w-full max-w-[850px] overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_360px]">
        {/* Left column: Instructions & Details */}
        <div className="p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-100">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e056fd] animate-pulse"></span>
              Thanh toán chuyển khoản VietQR
            </h1>
            <p className="text-[13px] text-neutral-400 mb-6 leading-relaxed">
              Vui lòng chuyển khoản chính xác thông tin bên dưới. Hệ thống sẽ tự động xác nhận sau 10-30 giây.
            </p>

            {status === 'processing' && (
              <div className="flex items-center gap-3 bg-[var(--primary-25)] border border-[var(--primary-50)] text-[var(--primary-700)] rounded-2xl p-4 mb-6">
                <Clock size={20} className="shrink-0 animate-pulse text-[#e056fd]" />
                <div className="text-xs font-semibold">
                  Mã QR sẽ hết hạn sau: <span className="font-extrabold text-sm ml-1 text-neutral-900">{formatTime(timeLeft)}</span>
                </div>
              </div>
            )}

            {/* Instruction Fields */}
            <div className="space-y-4">
              {/* Ngân hàng */}
              <div className="bg-neutral-50/60 border border-neutral-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="block text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Ngân hàng</span>
                  <span className="text-sm font-bold text-neutral-800">{bankDetails.bank || 'Đang tải...'}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(bankDetails.bank, 'Tên ngân hàng')}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {copiedField === 'Tên ngân hàng' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Số tài khoản */}
              <div className="bg-neutral-50/60 border border-neutral-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="block text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Số tài khoản</span>
                  <span className="text-[16px] font-extrabold text-neutral-900">{bankDetails.acc || 'Đang tải...'}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(bankDetails.acc, 'Số tài khoản')}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {copiedField === 'Số tài khoản' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Tên tài khoản */}
              <div className="bg-neutral-50/60 border border-neutral-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="block text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Chủ tài khoản</span>
                  <span className="text-sm font-bold text-neutral-800">
                    {bankDetails.accName || process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME || 'PETSHOP THEPAWSOME'}
                  </span>
                </div>
              </div>

              {/* Số tiền */}
              <div className="bg-neutral-50/60 border border-neutral-100 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="block text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Số tiền</span>
                  <span className="text-lg font-extrabold text-[#e056fd]">
                    {amount ? `${amount.toLocaleString()}đ` : 'Đang tải...'}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(bankDetails.amount, 'Số tiền')}
                  className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {copiedField === 'Số tiền' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Nội dung */}
              <div className="bg-orange-50/40 border border-orange-100/50 rounded-xl p-3.5 flex justify-between items-center">
                <div>
                  <span className="block text-[11px] text-orange-600 font-bold uppercase tracking-wider">Nội dung chuyển khoản (Bắt buộc ghi đúng)</span>
                  <span className="text-[16px] font-black text-orange-700 tracking-wide">{bankDetails.des || merchantRef || 'Đang tải...'}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(bankDetails.des || merchantRef || '', 'Nội dung chuyển khoản')}
                  className="p-2 hover:bg-orange-100/40 rounded-lg text-orange-500 hover:text-orange-700 transition-colors"
                >
                  {copiedField === 'Nội dung chuyển khoản' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-1">
            <span>Gặp khó khăn? Liên hệ Hotline để được hỗ trợ trực tiếp.</span>
          </div>
        </div>

        {/* Right column: QR code display and status overlay */}
        <div className="bg-neutral-50 p-6 md:p-8 flex flex-col items-center justify-center relative min-h-[360px]">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 size={40} className="text-[#e056fd] animate-spin mb-4" />
              <p className="text-sm font-bold text-neutral-600">Đang khởi tạo mã QR...</p>
            </div>
          )}

          {status === 'processing' && paymentUrl && (
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 mb-4 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={paymentUrl}
                  alt="VietQR code"
                  className="w-56 h-56 object-contain"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                <Loader2 size={14} className="animate-spin text-[#e056fd]" />
                Đang chờ chuyển khoản...
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
              <CheckCircle2 size={64} className="text-green-500 mb-4" />
              <h2 className="text-xl font-black text-green-600 mb-2">Thành công!</h2>
              <p className="text-xs text-neutral-500 mb-6">Đã nhận được khoản thanh toán của bạn.</p>
              <div className="w-full space-y-2">
                <Link
                  href={orderId ? `/orders/${orderId}` : '/orders'}
                  className="w-full h-11 bg-neutral-900 text-white rounded-xl flex items-center justify-center text-xs font-bold hover:bg-neutral-800 transition-colors"
                >
                  Xem đơn hàng
                </Link>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
              <XCircle size={64} className="text-red-500 mb-4" />
              <h2 className="text-xl font-black text-red-600 mb-2">Hết hạn giao dịch</h2>
              <p className="text-xs text-neutral-500 mb-6">Thời gian thanh toán cho mã QR này đã hết. Vui lòng quay lại và tạo mã thanh toán mới.</p>
              <Link
                href="/orders"
                className="w-full h-11 bg-neutral-100 text-neutral-800 rounded-xl flex items-center justify-center text-xs font-bold hover:bg-neutral-200 transition-colors"
              >
                Về danh sách đơn hàng
              </Link>
            </div>
          )}

          {status === 'reconciliation' && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
              <AlertTriangle size={64} className="text-amber-500 mb-4" />
              <h2 className="text-xl font-black text-neutral-800 mb-2">Đang đối soát</h2>
              <p className="text-xs text-neutral-500 mb-6">Hệ thống chưa nhận được tiền hoặc đang xử lý. Nếu bạn đã chuyển khoản thành công, xin vui lòng không chuyển lại và liên hệ hỗ trợ.</p>
              <Link
                href="/orders"
                className="w-full h-11 bg-neutral-900 text-white rounded-xl flex items-center justify-center text-xs font-bold hover:bg-neutral-800 transition-colors"
              >
                Kiểm tra đơn hàng
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SePayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 size={40} className="animate-spin text-[#e056fd]" />
      </div>
    }>
      <SePayContent />
    </Suspense>
  );
}
