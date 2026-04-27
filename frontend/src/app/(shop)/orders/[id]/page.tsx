"use client";
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, Truck, CheckCircle, XCircle, Package, CreditCard, MapPin, Phone, User } from 'lucide-react';

const statusConfig: Record<string, { label: string, color: string, bg: string, icon: typeof Clock }> = {
  pending: { label: 'Chờ xử lý', color: 'var(--primary-600)', bg: 'var(--primary-50)', icon: Clock },
  confirmed: { label: 'Đã xác nhận', color: 'var(--teal-600)', bg: 'var(--teal-50)', icon: CheckCircle },
  shipping: { label: 'Đang giao', color: '#2563eb', bg: '#eff6ff', icon: Truck },
  completed: { label: 'Hoàn thành', color: 'var(--success)', bg: 'var(--success-bg)', icon: CheckCircle },
  cancelled: { label: 'Đã huỷ', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: XCircle },
};

export default function OrderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', params.id],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.id}`);
      return res.data;
    }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/orders/${params.id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      alert("Đã huỷ đơn hàng thành công");
      queryClient.invalidateQueries({ queryKey: ['order', params.id] });
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Lỗi huỷ đơn");
    }
  });

  if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải...</div>;
  if (!order) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--danger)' }}>Không tìm thấy đơn hàng.</div>;

  const st = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = st.icon;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--neutral-500)', marginBottom: 32 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <Link href="/orders" style={{ color: 'inherit', textDecoration: 'none' }}>Đơn hàng</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>#{order.order_code}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px' }}>Đơn hàng #{order.order_code}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: '5px 12px', borderRadius: 8 }}>
              <StatusIcon size={14} /> {st.label}
            </span>
            <span style={{ fontSize: 13, color: 'var(--neutral-500)' }}>{new Date(order.created_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>
        {order.status === 'pending' && (
          <button 
            onClick={() => { if (confirm("Bạn chắc chắn muốn huỷ đơn hàng này chứ?")) cancelOrderMutation.mutate(); }}
            disabled={cancelOrderMutation.isPending}
            style={{
              padding: '10px 20px', borderRadius: 12, border: '1.5px solid var(--danger)',
              background: 'transparent', color: 'var(--danger)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', transition: 'all 120ms ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--danger)'; }}
          >
            {cancelOrderMutation.isPending ? "Đang huỷ..." : "Huỷ đơn hàng"}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Shipping Info */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={16} /></div>
            Thông tin giao hàng
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <User size={15} style={{ color: 'var(--neutral-400)' }} />
              <span>{order.ship_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <Phone size={15} style={{ color: 'var(--neutral-400)' }} />
              <span>{order.ship_phone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
              <MapPin size={15} style={{ color: 'var(--neutral-400)', marginTop: 2 }} />
              <span>{order.ship_address}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--teal-50)', color: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={16} /></div>
            Thanh toán
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--neutral-500)' }}>Phương thức</span>
              <span style={{ fontWeight: 600 }}>{order.payment_method === 'vnpay' ? 'VNPay' : 'Thanh toán khi nhận hàng'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--neutral-500)' }}>Trạng thái TT</span>
              <span style={{
                fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 6,
                color: order.payment_status === 'paid' ? 'var(--success)' : 'var(--primary-600)',
                background: order.payment_status === 'paid' ? 'var(--success-bg)' : 'var(--primary-50)',
              }}>
                {order.payment_status === 'paid' ? 'ĐÃ THANH TOÁN' : order.payment_status === 'unpaid' ? 'CHƯA THANH TOÁN' : 'THẤT BẠI'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--neutral-50)', color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} /></div>
          Sản phẩm ({order.items.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {order.items.map((item: { product_name: string; quantity: number; price: number }, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < order.items.length - 1 ? '1px solid var(--neutral-100)' : 'none' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-800)' }}>{item.product_name}</div>
                <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 2 }}>SL: {item.quantity} × {item.price.toLocaleString()}đ</div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-900)' }}>{(item.price * item.quantity).toLocaleString()}đ</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--neutral-100)', marginTop: 16, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--neutral-500)' }}>Tạm tính</span>
            <span style={{ fontWeight: 600 }}>{order.subtotal.toLocaleString()}đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: 'var(--neutral-500)' }}>Phí vận chuyển</span>
            <span style={{ fontWeight: 600 }}>{order.shipping_fee.toLocaleString()}đ</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--neutral-100)', paddingTop: 12, marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>Tổng cộng</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-600)' }}>{order.total.toLocaleString()}đ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
