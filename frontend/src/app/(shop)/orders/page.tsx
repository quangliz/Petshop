"use client";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { LucideIcon, ChevronRight, Package, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { Order } from '@/lib/types';

const statusConfig: Record<string, { label: string, color: string, bg: string, icon: LucideIcon }> = {
  pending: { label: 'Chờ xử lý', color: 'var(--primary-600)', bg: 'var(--primary-50)', icon: Clock },
  confirmed: { label: 'Đã xác nhận', color: 'var(--teal-600)', bg: 'var(--teal-50)', icon: CheckCircle },
  shipping: { label: 'Đang giao', color: '#2563eb', bg: '#eff6ff', icon: Truck },
  completed: { label: 'Hoàn thành', color: 'var(--success)', bg: 'var(--success-bg)', icon: CheckCircle },
  cancelled: { label: 'Đã huỷ', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: XCircle },
};

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data;
    }
  });

  if (isLoading) return <div className="py-24 text-center" style={{ color: 'var(--neutral-500)' }}>Đang tải đơn hàng...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm mb-6 sm:mb-8" style={{ color: 'var(--neutral-500)' }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>Đơn hàng của tôi</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6 sm:mb-8">Lịch sử đơn hàng</h1>

      {orders?.length === 0 && (
        <div className="card px-6 py-12 sm:py-16 text-center">
          <Package size={48} className="mx-auto mb-4" style={{ color: 'var(--neutral-300)' }} />
          <div className="text-base sm:text-lg font-bold mb-2" style={{ color: 'var(--neutral-600)' }}>Chưa có đơn hàng nào</div>
          <div className="text-sm mb-6" style={{ color: 'var(--neutral-400)' }}>Hãy khám phá cửa hàng và đặt hàng cho bé pet nhé!</div>
          <Link href="/shop" className="btn btn-primary">Mua sắm ngay</Link>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4">
        {orders?.map((order: Order) => {
          const st = statusConfig[order.status] || statusConfig.pending;
          const Icon = st.icon;
          return (
            <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                className="card cursor-pointer transition-all duration-150"
                style={{ padding: '16px 20px' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Mobile layout: stacked; Desktop: single row */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left: icon + order code + date */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center" style={{ background: st.bg, color: st.color }}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--neutral-900)' }}>#{order.order_code}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--neutral-500)' }}>{new Date(order.created_at).toLocaleString('vi-VN')}</div>
                    </div>
                  </div>

                  {/* Right: status + amount + chevron */}
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg" style={{ color: st.color, background: st.bg, letterSpacing: '0.03em' }}>
                      {st.label}
                    </span>
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-bold" style={{ color: 'var(--primary-600)' }}>{order.total.toLocaleString()}đ</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--neutral-400)' }}>
                        <span className="sm:hidden" style={{ color: st.color, fontWeight: 700 }}>{st.label} · </span>
                        {order.payment_method === 'vnpay' ? 'VNPay' : 'COD'}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--neutral-300)' }} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
