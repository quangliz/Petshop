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

  if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải đơn hàng...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--neutral-500)', marginBottom: 32 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>Đơn hàng của tôi</span>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 32px' }}>Lịch sử đơn hàng</h1>

      {orders?.length === 0 && (
        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--neutral-300)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-600)', marginBottom: 8 }}>Chưa có đơn hàng nào</div>
          <div style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 24 }}>Hãy khám phá cửa hàng và đặt hàng cho bé pet nhé!</div>
          <Link href="/shop" className="btn btn-primary">Mua sắm ngay</Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {orders?.map((order: Order) => {
          const st = statusConfig[order.status] || statusConfig.pending;
          const Icon = st.icon;
          return (
            <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{
                padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', transition: 'all 160ms ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-900)' }}>#{order.order_code}</div>
                    <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 2 }}>{new Date(order.created_at).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {st.label}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary-600)' }}>{order.total.toLocaleString()}đ</div>
                    <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 2 }}>{order.payment_method === 'vnpay' ? 'VNPay' : 'COD'}</div>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--neutral-300)' }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
