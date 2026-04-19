"use client";
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ChevronRight, CreditCard, Truck, ShieldCheck, MapPin, Phone, User as UserIcon, MessageSquare } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: user.full_name || prev.name,
        phone: user.phone || prev.phone,
        address: user.address || prev.address
      }));
    }
  }, [user]);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/cart');
      return res.data;
    }
  });

  const total = (cart?.total_amount || 0) + 30000;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/orders/checkout', {
        ship_name: form.name,
        ship_phone: form.phone,
        ship_address: form.address,
        note: form.note,
        payment_method: paymentMethod
      });
      const order = res.data;

      if (paymentMethod === 'vnpay') {
        const vnpRes = await api.post(`/payments/vnpay/create/${order.id}`);
        window.location.href = vnpRes.data.payment_url;
      } else {
        router.push(`/orders/${order.id}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Lỗi đặt hàng");
      setLoading(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Giỏ hàng của bạn đang trống.</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--neutral-500)', marginBottom: 32 }}>
        <Link href="/cart" style={{ color: 'inherit', textDecoration: 'none' }}>Giỏ hàng</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>Thanh toán</span>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 40 }}>Xác nhận đơn hàng</h1>

      <form onSubmit={handleCheckout} style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 48, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Shipping Info */}
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={20}/></div>
              Thông tin nhận hàng
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Họ và tên người nhận</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} style={{ position: 'absolute', left: 14, top: 18, color: 'var(--neutral-400)' }} />
                  <input required style={{ width: '100%', padding: '14px 16px 14px 40px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Số điện thoại</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 14, top: 18, color: 'var(--neutral-400)' }} />
                  <input required style={{ width: '100%', padding: '14px 16px 14px 40px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Địa chỉ giao hàng</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: 14, top: 18, color: 'var(--neutral-400)' }} />
                  <input required style={{ width: '100%', padding: '14px 16px 14px 40px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Ghi chú cho đơn hàng (tuỳ chọn)</label>
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={16} style={{ position: 'absolute', left: 14, top: 18, color: 'var(--neutral-400)' }} />
                  <input style={{ width: '100%', padding: '14px 16px 14px 40px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--teal-50)', color: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={20}/></div>
              Phương thức thanh toán
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16, border: '1.5px solid',
                borderColor: paymentMethod === 'cod' ? 'var(--primary-500)' : 'var(--neutral-100)',
                background: paymentMethod === 'cod' ? 'var(--primary-25)' : 'white', cursor: 'pointer', transition: 'all 120ms ease'
              }}>
                <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ width: 20, height: 20, accentColor: 'var(--primary-600)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Thanh toán khi nhận hàng (COD)</div>
                  <div style={{ fontSize: 13, color: 'var(--neutral-500)' }}>Trả tiền mặt cho shipper khi nhận được hàng</div>
                </div>
              </label>
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16, border: '1.5px solid',
                borderColor: paymentMethod === 'vnpay' ? 'var(--primary-500)' : 'var(--neutral-100)',
                background: paymentMethod === 'vnpay' ? 'var(--primary-25)' : 'white', cursor: 'pointer', transition: 'all 120ms ease'
              }}>
                <input type="radio" name="payment" value="vnpay" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} style={{ width: 20, height: 20, accentColor: 'var(--primary-600)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#005baa' }}>Ví điện tử VNPay</div>
                  <div style={{ fontSize: 13, color: 'var(--neutral-500)' }}>Thanh toán qua app ngân hàng hoặc thẻ ATM/Quốc tế</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div style={{ position: 'sticky', top: 100 }}>
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Đơn hàng của bạn</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {cart.items.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--neutral-600)', flex: 1 }}>{item.quantity}x {item.product_name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-900)' }}>{((item.sale_price || item.price) * item.quantity).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--neutral-100)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--neutral-500)' }}>Tạm tính</span>
                <span style={{ fontWeight: 600 }}>{cart.total_amount.toLocaleString()}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--neutral-500)' }}>Phí vận chuyển</span>
                <span style={{ fontWeight: 600 }}>30,000đ</span>
              </div>
              <div style={{ borderTop: '1px solid var(--neutral-100)', marginTop: 8, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Tổng cộng</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-600)' }}>{total.toLocaleString()}đ</span>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 32, height: 56, borderRadius: 16, fontSize: 16 }}>
              {loading ? "Đang xử lý..." : "Xác nhận đặt hàng"}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, color: 'var(--neutral-400)', fontSize: 12 }}>
              <ShieldCheck size={14} /> Thanh toán an toàn & bảo mật
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

import Link from 'next/link';
