"use client";
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Clock, Truck, CheckCircle, XCircle, Package, CreditCard, MapPin, Phone, User } from 'lucide-react';
import { OrderDetailSkeleton } from '@/components/skeletons/OrderRowSkeleton';

const statusConfig: Record<string, { label: string, color: string, bg: string, icon: typeof Clock }> = {
  pending: { label: 'Chờ xử lý', color: 'var(--primary-600)', bg: 'var(--primary-50)', icon: Clock },
  confirmed: { label: 'Đã xác nhận', color: 'var(--teal-600)', bg: 'var(--teal-50)', icon: CheckCircle },
  shipping: { label: 'Đang giao', color: '#2563eb', bg: '#eff6ff', icon: Truck },
  completed: { label: 'Hoàn thành', color: 'var(--success)', bg: 'var(--success-bg)', icon: CheckCircle },
  cancelled: { label: 'Đã huỷ', color: 'var(--danger)', bg: 'var(--danger-bg)', icon: XCircle },
};

const cardCls = "bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 sm:p-6";

export default function OrderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', params.id],
    queryFn: async () => { const res = await api.get(`/orders/${params.id}`); return res.data; }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => { const res = await api.put(`/orders/${params.id}/cancel`); return res.data; },
    onSuccess: () => { alert("Đã huỷ đơn hàng thành công"); queryClient.invalidateQueries({ queryKey: ['order', params.id] }); },
    onError: (err: unknown) => { const e = err as { response?: { data?: { detail?: string } } }; alert(e.response?.data?.detail || "Lỗi huỷ đơn"); }
  });

  if (isLoading) return <OrderDetailSkeleton />;
  if (!order) return <div className="py-24 text-center" style={{ color: 'var(--danger)' }}>Không tìm thấy đơn hàng.</div>;

  const st = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = st.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 mb-6 sm:mb-8">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link href="/orders" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Đơn hàng</Link>
        <ChevronRight size={14} />
        <span className="truncate max-w-[140px] sm:max-w-none text-neutral-900 font-semibold">#{order.order_code}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Đơn hàng #{order.order_code}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ color: st.color, background: st.bg }}>
              <StatusIcon size={13} /> {st.label}
            </span>
            <span className="text-xs sm:text-sm text-neutral-500">{new Date(order.created_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>
        {order.status === 'pending' && (
          <button
            onClick={() => { if (confirm("Bạn chắc chắn muốn huỷ đơn hàng này chứ?")) cancelOrderMutation.mutate(); }}
            disabled={cancelOrderMutation.isPending}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl text-sm font-bold border-[1.5px] bg-transparent cursor-pointer transition-all duration-150 disabled:opacity-70 hover:text-white"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
          >
            {cancelOrderMutation.isPending ? "Đang huỷ..." : "Huỷ đơn hàng"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Shipping Info */}
        <div className={cardCls}>
          <h2 className="text-sm sm:text-base font-extrabold mb-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}><Truck size={15} /></div>
            Thông tin giao hàng
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-sm"><User size={14} className="text-neutral-400 shrink-0" /><span>{order.ship_name}</span></div>
            <div className="flex items-center gap-2.5 text-sm"><Phone size={14} className="text-neutral-400 shrink-0" /><span>{order.ship_phone}</span></div>
            <div className="flex items-start gap-2.5 text-sm"><MapPin size={14} className="text-neutral-400 shrink-0 mt-0.5" /><span>{order.ship_address}</span></div>
          </div>
        </div>

        {/* Payment Info */}
        <div className={cardCls}>
          <h2 className="text-sm sm:text-base font-extrabold mb-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}><CreditCard size={15} /></div>
            Thanh toán
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Phương thức</span>
              <span className="font-semibold">{order.payment_method === 'vnpay' ? 'VNPay' : 'Thanh toán khi nhận hàng'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500">Trạng thái TT</span>
              <span className="text-xs font-bold px-2 py-1 rounded-md" style={{
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
      <div className={cardCls}>
        <h2 className="text-sm sm:text-base font-extrabold mb-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-neutral-50 text-neutral-600"><Package size={15} /></div>
          Sản phẩm ({order.items.length})
        </h2>
        <div className="flex flex-col">
          {order.items.map((item: { product_name: string; quantity: number; price: number }, idx: number) => (
            <div key={idx} className={`flex justify-between items-center py-3 ${idx < order.items.length - 1 ? 'border-b border-neutral-100' : ''}`}>
              <div className="min-w-0 pr-3">
                <div className="text-sm font-semibold text-neutral-800">{item.product_name}</div>
                <div className="text-xs mt-0.5 text-neutral-500">SL: {item.quantity} × {item.price.toLocaleString()}đ</div>
              </div>
              <span className="text-sm sm:text-base font-bold shrink-0 text-neutral-900">{(item.price * item.quantity).toLocaleString()}đ</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-neutral-100">
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Tạm tính</span><span className="font-semibold">{order.subtotal.toLocaleString()}đ</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Phí vận chuyển</span><span className="font-semibold">{order.shipping_fee.toLocaleString()}đ</span></div>
          <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-neutral-100">
            <span className="text-base font-extrabold">Tổng cộng</span>
            <span className="text-xl sm:text-2xl font-extrabold" style={{ color: 'var(--primary-600)' }}>{order.total.toLocaleString()}đ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
