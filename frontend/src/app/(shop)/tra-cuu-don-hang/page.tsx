'use client';

import { useState, FormEvent } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderDetail {
  id: string;
  order_code: string;
  status: string;
  total: number;
  shipping_fee: number;
  subtotal: number;
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  payment_method: string;
  payment_status: string;
  items: OrderItem[];
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng',
  vnpay: 'VNPay',
};

function getRecentGuestOrder(): { email?: string; orderCode?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('guest_order_result');
    if (!raw) return null;
    sessionStorage.removeItem('guest_order_result');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function GuestOrderLookupPage() {
  const [recentOrder] = useState(getRecentGuestOrder);
  const [email, setEmail] = useState(recentOrder?.email || '');
  const [orderCode, setOrderCode] = useState(recentOrder?.orderCode || '');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await api.post('/orders/guest-lookup', {
        email,
        order_code: orderCode,
      });
      setOrder(res.data);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Không tìm thấy đơn hàng với thông tin đã nhập.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">Tra cứu đơn hàng</h1>
      <p className="text-sm text-gray-500 mb-6">
        Nhập email và mã đơn hàng để xem thông tin đơn hàng của bạn.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label htmlFor="lookup-email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="lookup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="lookup-order-code" className="block text-sm font-medium mb-1">
            Mã đơn hàng
          </label>
          <input
            id="lookup-order-code"
            type="text"
            required
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
            placeholder="ORD-XXXXXXXXXXXX"
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          id="lookup-submit"
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition"
        >
          {loading ? 'Đang tìm...' : 'Tra cứu'}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6"
        >
          {error}
        </div>
      )}

      {order && (
        <div className="border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Mã đơn hàng</p>
              <p className="font-mono font-semibold text-lg">{order.order_code}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>

          <hr />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Người nhận</p>
              <p className="font-medium">{order.ship_name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Số điện thoại</p>
              <p className="font-medium">{order.ship_phone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 text-xs mb-0.5">Địa chỉ giao hàng</p>
              <p className="font-medium">{order.ship_address}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Phương thức thanh toán</p>
              <p className="font-medium">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Trạng thái thanh toán</p>
              <p className="font-medium capitalize">{order.payment_status}</p>
            </div>
          </div>

          <hr />

          <div>
            <p className="text-sm font-medium mb-2">Sản phẩm</p>
            <ul className="space-y-1 text-sm">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <hr />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Tạm tính</span>
              <span>{order.subtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Phí vận chuyển</span>
              <span>{order.shipping_fee.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t">
              <span>Tổng cộng</span>
              <span>{order.total.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-8 text-center">
        Bạn có tài khoản?{' '}
        <Link href="/orders" className="underline hover:text-primary">
          Xem đơn hàng của tôi
        </Link>
      </p>
    </div>
  );
}
