"use client";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { LucideIcon, ChevronRight, Package, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
import { Order } from '@/lib/types';
import { OrdersPageSkeleton } from "@/components/skeletons/OrderRowSkeleton";
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
    queryFn: async () => { const res = await api.get('/orders/'); return res.data; }
  });

  if (isLoading) return <OrdersPageSkeleton />;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 mb-6 sm:mb-8">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Đơn hàng của tôi</span>
      </div>

      <h1 className="text-2xl md:text-[32px] font-extrabold tracking-[-0.025em] mb-6">Lịch sử đơn hàng</h1>

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
            <Link key={order.id} href={`/orders/${order.id}`} className="no-underline text-inherit">
              <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm px-4 py-4 sm:px-5 cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center" style={{ background: st.bg, color: st.color }}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-bold truncate text-neutral-900">#{order.order_code}</div>
                      <div className="text-xs mt-0.5 text-neutral-500">{new Date(order.created_at).toLocaleString('vi-VN')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg" style={{ color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-bold" style={{ color: 'var(--primary-600)' }}>{order.total.toLocaleString()}đ</div>
                      <div className="text-xs mt-0.5 text-neutral-400">
                        <span className="sm:hidden font-bold" style={{ color: st.color }}>{st.label} · </span>
                        {order.payment_method === 'sepay' ? 'VietQR' : 'COD'}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-300" />
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
