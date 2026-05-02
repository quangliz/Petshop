"use client";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { LucideIcon, ChevronRight, Package, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { Order } from '@/lib/types';
import { OrderRowSkeleton } from "@/components/skeletons/OrderRowSkeleton";
import { EmptyState } from '@/components/ui/empty-state';
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

  if (isLoading) return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex flex-col gap-3 sm:gap-4">
        {[...Array(3)].map((_, i) => <OrderRowSkeleton key={i} />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm mb-6 sm:mb-8" style={{ color: 'var(--neutral-500)' }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>Đơn hàng của tôi</span>
      </div>

      <h1 className="text-2xl md:text-[32px]" style={{ fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 24px 0' }}>Lịch sử đơn hàng</h1>

      {orders?.length === 0 && (
        <EmptyState
          icon={<Package size={32} />}
          title="Chưa có đơn hàng nào"
          description="Hãy khám phá cửa hàng và đặt hàng cho bé pet nhé!"
          actionLabel="Mua sắm ngay"
          actionHref="/shop"
        />
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
