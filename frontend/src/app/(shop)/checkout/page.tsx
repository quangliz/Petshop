"use client";
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getGuestCart, clearGuestCart, GuestCartItem } from '@/lib/guestCart';
import { ChevronRight, CreditCard, Truck, ShieldCheck, Phone, User as UserIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { VietnamAddressPicker } from '@/components/VietnamAddressPicker';

interface DisplayItem {
  id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  sale_price?: number;
  price: number;
}

function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const selectedItemIds = useMemo(() => searchParams.getAll('items'), [searchParams]);
  const [form, setForm] = useState(() => ({
    name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    note: ''
  }));
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Guest cart state
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([]);
  const [guestProducts, setGuestProducts] = useState<DisplayItem[]>([]);
  const isGuest = !user;

  useEffect(() => {
    if (!isGuest) return;
    const items = getGuestCart();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuestItems(items);
    if (items.length === 0) return;
    Promise.all(
      items.map(i =>
        api.get(`/products/${i.slug}`).then(r => ({
          id: i.product_id,
          product_id: i.product_id,
          quantity: i.quantity,
          product_name: r.data.name,
          sale_price: r.data.sale_price ?? undefined,
          price: r.data.price,
        }))
      )
    ).then(setGuestProducts).catch(() => {});
  }, [isGuest]);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/cart/');
      return res.data;
    },
    enabled: !isGuest,
  });

  const displayItems: DisplayItem[] = useMemo(() => {
    if (isGuest) return guestProducts;
    const all: DisplayItem[] = (cart?.items || []).map((i: DisplayItem) => ({ ...i, product_id: i.product_id || i.id }));
    if (selectedItemIds.length === 0) return all;
    const idSet = new Set(selectedItemIds);
    return all.filter(i => idSet.has(i.id));
  }, [isGuest, guestProducts, cart, selectedItemIds]);

  const subtotal = useMemo(
    () => displayItems.reduce((sum, i) => sum + (i.sale_price || i.price) * i.quantity, 0),
    [displayItems]
  );
  const total = subtotal + 30000;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let order;
      if (isGuest) {
        const res = await api.post('/orders/guest-checkout', {
          ship_name: form.name,
          ship_phone: form.phone,
          ship_address: form.address,
          note: form.note,
          payment_method: paymentMethod,
          items: guestItems,
        });
        order = res.data;
        clearGuestCart();
      } else {
        const res = await api.post('/orders/checkout', {
          ship_name: form.name,
          ship_phone: form.phone,
          ship_address: form.address,
          note: form.note,
          payment_method: paymentMethod,
          ...(selectedItemIds.length > 0 ? { item_ids: selectedItemIds } : {})
        });
        order = res.data;
      }

      if (paymentMethod === 'vnpay') {
        const vnpRes = await api.post(`/payments/vnpay/create/${order.id}`);
        window.location.href = vnpRes.data.payment_url;
      } else {
        router.push(`/orders/${order.id}?guest=1`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || "Lỗi đặt hàng");
      setLoading(false);
    }
  };

  const isEmpty = isGuest ? (guestProducts.length === 0 && guestItems.length > 0 ? false : displayItems.length === 0) : (!cart || displayItems.length === 0);

  if (isEmpty && !(isGuest && guestItems.length > 0)) {
    return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Giỏ hàng của bạn đang trống.</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6 md:mb-8">
        <Link href="/cart" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Giỏ hàng</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Thanh toán</span>
      </div>

      <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight mb-6 md:mb-10">Xác nhận đơn hàng</h1>

      <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-start">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Shipping Info */}
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--primary-50)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={20}/></div>
              Thông tin nhận hàng
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="sm:col-span-2">
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
              <div className="sm:col-span-2">
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Địa chỉ giao hàng</label>
                <VietnamAddressPicker value={form.address} onChange={v => setForm({...form, address: v})} />
              </div>
              <div className="sm:col-span-2">
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
        <div className="relative lg:sticky lg:top-24 order-first lg:order-last">
          <div className="card p-5 md:p-7">
            <h3 
              className="text-[18px] font-extrabold mb-5 flex justify-between items-center cursor-pointer lg:cursor-auto"
              onClick={() => setIsSummaryOpen(!isSummaryOpen)}
            >
              Đơn hàng của bạn
              <span className="lg:hidden text-primary-600 text-[14px] font-semibold bg-primary-50 px-3 py-1.5 rounded-lg">{isSummaryOpen ? 'Thu gọn' : 'Chi tiết'}</span>
            </h3>
            <div className={`${isSummaryOpen ? 'flex' : 'hidden'} lg:flex flex-col gap-4 mb-6`}>
              {displayItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--neutral-600)', flex: 1 }}>{item.quantity}x {item.product_name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-900)' }}>{((item.sale_price || item.price) * item.quantity).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--neutral-100)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--neutral-500)' }}>Tạm tính</span>
                <span style={{ fontWeight: 600 }}>{subtotal.toLocaleString()}đ</span>
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

export default function CheckoutPageWrapper() {
  return (
    <Suspense>
      <CheckoutPage />
    </Suspense>
  );
}
