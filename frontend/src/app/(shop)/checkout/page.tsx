"use client";
import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getGuestCart, clearGuestCart, getGuestCartItemKey, GuestCartItem } from '@/lib/guestCart';
import { ChevronRight, CreditCard, Truck, ShieldCheck, Phone, User as UserIcon, MessageSquare, X } from 'lucide-react';
import Link from 'next/link';
import { VietnamAddressPicker } from '@/components/VietnamAddressPicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

interface DisplayItem {
  id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  product_name: string;
  variant_attributes?: Record<string, string> | null;
  sale_price?: number;
  price: number;
}

interface CouponDetail {
  code: string;
  promo_type: 'product' | 'shipping';
  discount_amount: number;
}

const checkoutSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z.string().min(1, 'Vui lòng nhập số điện thoại').regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(1, 'Vui lòng chọn địa chỉ'),
  note: z.string().optional(),
  guestEmail: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

const inputCls = "w-full py-[14px] px-4 rounded-[12px] border-[1.5px] border-neutral-200 outline-none text-[14px]";
const inputWithIconCls = "w-full py-[14px] pl-10 pr-4 rounded-[12px] border-[1.5px] outline-none text-[14px]";
const labelCls = "block text-[13px] font-bold mb-2";
const errorCls = "text-[12px] font-semibold mt-1.5";

function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const selectedItemIds = useMemo(() => searchParams.getAll('items'), [searchParams]);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: user?.full_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      note: '',
      guestEmail: '',
    },
  });

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const isGuest = !user;
  const [guestItems] = useState<GuestCartItem[]>(() => (isGuest ? getGuestCart() : []));
  const [guestProducts, setGuestProducts] = useState<DisplayItem[]>([]);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCodes, setAppliedCodes] = useState<string[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingDiscountAmount, setShippingDiscountAmount] = useState(0);
  const [couponDetails, setCouponDetails] = useState<CouponDetail[]>([]);

  const hasTrackedCheckoutStart = useRef(false);

  useEffect(() => {
    if (!isGuest) return;
    const items = guestItems;
    if (items.length === 0) return;
    Promise.all(
      items.map(i =>
        api.get(`/products/${i.slug}`).then(r => ({
          id: getGuestCartItemKey(i),
          product_id: i.product_id,
          variant_id: i.variant_id ?? null,
          quantity: i.quantity,
          ...(() => {
            const variant = r.data.variants?.find((v: { id: string }) => v.id === i.variant_id);
            return {
              product_name: r.data.name,
              variant_attributes: variant?.attributes ?? null,
              sale_price: variant ? (variant.sale_price ?? undefined) : (r.data.sale_price ?? undefined),
              price: variant?.price ?? r.data.price,
            };
          })(),
        }))
      )
    ).then(setGuestProducts).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);


  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { const res = await api.get('/cart/'); return res.data; },
    enabled: !isGuest,
  });

  const displayItems: DisplayItem[] = useMemo(() => {
    if (isGuest) return guestProducts;
    const all: DisplayItem[] = (cart?.items || []).map((i: DisplayItem) => ({ ...i, product_id: i.product_id || i.id }));
    if (selectedItemIds.length === 0) return all;
    const idSet = new Set(selectedItemIds);
    return all.filter(i => idSet.has(i.id));
  }, [isGuest, guestProducts, cart, selectedItemIds]);

  const subtotal = useMemo(() => displayItems.reduce((sum, i) => sum + (i.sale_price || i.price) * i.quantity, 0), [displayItems]);
  const total = Math.max(0, subtotal - discountAmount) + Math.max(0, 30000 - shippingDiscountAmount);

  useEffect(() => {
    if (subtotal > 0 && !hasTrackedCheckoutStart.current) {
      hasTrackedCheckoutStart.current = true;
      api.post('/analytics/events', {
        event_name: 'checkout_start',
        properties: {
          subtotal,
          item_count: displayItems.length,
          items: displayItems.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            price: item.sale_price || item.price,
          }))
        }
      }).catch(() => {});
    }
  }, [subtotal, displayItems]);

  useEffect(() => {
    if (appliedCodes.length > 0 && subtotal > 0) {
      api.post('/promotions/validate', {
        coupon_codes: appliedCodes,
        subtotal: subtotal,
        shipping_fee: 30000.0,
      }).then(res => {
        setDiscountAmount(res.data.discount_amount);
        setShippingDiscountAmount(res.data.shipping_discount_amount);
        setCouponDetails(res.data.details);
      }).catch(() => {
        setAppliedCodes([]);
        setDiscountAmount(0);
        setShippingDiscountAmount(0);
        setCouponDetails([]);
        toast.error('Các mã giảm giá đã bị gỡ bỏ do giá trị đơn hàng thay đổi.');
      });
    }
  }, [subtotal, appliedCodes]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const newCode = couponInput.trim().toUpperCase();
    if (appliedCodes.includes(newCode)) {
      toast.error('Mã giảm giá này đã được nhập.');
      return;
    }
    const newCodes = [...appliedCodes, newCode];
    if (newCodes.length > 2) {
      toast.error('Chỉ được áp dụng tối đa 2 mã giảm giá.');
      return;
    }
    try {
      const res = await api.post('/promotions/validate', {
        coupon_codes: newCodes,
        subtotal: subtotal,
        shipping_fee: 30000.0,
      });
      setAppliedCodes(res.data.applied_codes);
      setDiscountAmount(res.data.discount_amount);
      setShippingDiscountAmount(res.data.shipping_discount_amount);
      setCouponDetails(res.data.details);
      setCouponInput('');
      toast.success('Áp dụng mã giảm giá thành công!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Mã giảm giá không hợp lệ.';
      toast.error(msg);
    }
  };

  const handleRemoveCoupon = async (codeToRemove: string) => {
    const newCodes = appliedCodes.filter(c => c !== codeToRemove);
    try {
      if (newCodes.length === 0) {
        setAppliedCodes([]);
        setDiscountAmount(0);
        setShippingDiscountAmount(0);
        setCouponDetails([]);
        toast.info(`Đã gỡ mã giảm giá ${codeToRemove}`);
        return;
      }
      const res = await api.post('/promotions/validate', {
        coupon_codes: newCodes,
        subtotal: subtotal,
        shipping_fee: 30000.0,
      });
      setAppliedCodes(res.data.applied_codes);
      setDiscountAmount(res.data.discount_amount);
      setShippingDiscountAmount(res.data.shipping_discount_amount);
      setCouponDetails(res.data.details);
      toast.info(`Đã gỡ mã giảm giá ${codeToRemove}`);
    } catch {
      setAppliedCodes([]);
      setDiscountAmount(0);
      setShippingDiscountAmount(0);
      setCouponDetails([]);
    }
  };

  const onSubmit = async (data: CheckoutForm) => {
    try {
      if (isGuest && !data.guestEmail) {
        toast.error('Vui lòng nhập email để nhận và tra cứu đơn hàng.');
        return;
      }
      const checkoutPayload = isGuest ? {
        ship_name: data.name, ship_phone: data.phone, ship_address: data.address,
        note: data.note, guest_email: data.guestEmail, payment_method: paymentMethod, items: guestItems,
        coupon_codes: appliedCodes,
      } : {
        ship_name: data.name, ship_phone: data.phone, ship_address: data.address,
        note: data.note, payment_method: paymentMethod,
        ...(selectedItemIds.length > 0 ? { item_ids: selectedItemIds } : {}),
        coupon_codes: appliedCodes,
      };
      const fingerprint = JSON.stringify(checkoutPayload);
      const stored = sessionStorage.getItem('checkout_idempotency');
      let idempotencyState: { fingerprint: string; key: string } | null = null;
      try { idempotencyState = stored ? JSON.parse(stored) : null; } catch {}
      if (!idempotencyState || idempotencyState.fingerprint !== fingerprint) {
        idempotencyState = { fingerprint, key: crypto.randomUUID() };
        sessionStorage.setItem('checkout_idempotency', JSON.stringify(idempotencyState));
      }

      let order;
      if (isGuest) {
        const res = await api.post('/orders/guest-checkout', checkoutPayload, {
          headers: { 'Idempotency-Key': idempotencyState.key },
        });
        order = res.data;
        clearGuestCart();
      } else {
        const res = await api.post('/orders/checkout', checkoutPayload, {
          headers: { 'Idempotency-Key': idempotencyState.key },
        });
        order = res.data;
      }

      // Track purchase event in funnel analytics
      api.post('/analytics/events', {
        event_name: 'purchase',
        properties: {
          order_id: order.id,
          order_code: order.order_code,
          subtotal: subtotal,
          discount_amount: discountAmount,
          shipping_discount_amount: shippingDiscountAmount,
          total: total,
          payment_method: paymentMethod,
          coupon_codes: appliedCodes,
        }
      }).catch(() => {});
      sessionStorage.removeItem('checkout_idempotency');
      if (paymentMethod === 'vnpay') {
        const paymentKeyName = `payment_idempotency:${order.id}`;
        let paymentKey = sessionStorage.getItem(paymentKeyName);
        if (!paymentKey) {
          paymentKey = crypto.randomUUID();
          sessionStorage.setItem(paymentKeyName, paymentKey);
        }
        const vnpRes = await api.post(`/payments/vnpay/create/${order.id}`, null, {
          headers: {
            'Idempotency-Key': paymentKey,
            ...(order.guest_order_token ? { 'X-Guest-Order-Token': order.guest_order_token } : {}),
          },
        });
        sessionStorage.setItem(`payment_context:${vnpRes.data.merchant_ref}`, JSON.stringify({
          guestOrderToken: order.guest_order_token || null,
          orderId: order.id,
          orderCode: order.order_code,
        }));
        window.location.assign(vnpRes.data.payment_url);
      } else {
        toast.success('Đặt hàng thành công!');
        if (isGuest) {
          sessionStorage.setItem('guest_order_result', JSON.stringify({
            email: data.guestEmail,
            orderCode: order.order_code,
          }));
          router.push('/tra-cuu-don-hang?created=1');
        } else {
          router.push(`/orders/${order.id}`);
        }
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast.error(axiosErr.response?.data?.detail || 'Lỗi đặt hàng. Vui lòng thử lại.');
    }
  };

  const isEmpty = isGuest ? (guestProducts.length === 0 && guestItems.length > 0 ? false : displayItems.length === 0) : (!cart || displayItems.length === 0);
  if (isEmpty && !(isGuest && guestItems.length > 0)) {
    return <div className="py-[100px] text-center text-neutral-500">Giỏ hàng của bạn đang trống.</div>;
  }

  const paymentOptionCls = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-2xl border-[1.5px] cursor-pointer transition-all duration-120 ${active ? 'border-[var(--primary-500)] bg-[var(--primary-25)]' : 'border-neutral-100 bg-white'}`;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6 md:mb-8">
        <Link href="/cart" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Giỏ hàng</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Thanh toán</span>
      </div>

      <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight mb-6 md:mb-10">Xác nhận đơn hàng</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-start">
        <div className="flex flex-col gap-8">
          {/* Shipping Info */}
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 md:p-8">
            <h2 className="text-lg md:text-xl font-extrabold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                <Truck size={20} />
              </div>
              Thông tin nhận hàng
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {isGuest && (
                <div className="sm:col-span-2">
                  <label htmlFor="guest-email" className={labelCls}>Email (để tra cứu đơn hàng sau)</label>
                  <input {...register('guestEmail')} id="guest-email" type="email" placeholder="email@example.com" className={inputCls} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={labelCls}>Họ và tên người nhận</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-[18px] text-neutral-400" />
                  <input {...register('name')}
                    className={`${inputWithIconCls}`}
                    style={{ borderColor: errors.name ? 'var(--danger)' : 'var(--neutral-200)' }}
                  />
                </div>
                {errors.name && <p className={errorCls} style={{ color: 'var(--danger)' }}>{errors.name.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Số điện thoại</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-[18px] text-neutral-400" />
                  <input {...register('phone')}
                    className={inputWithIconCls}
                    style={{ borderColor: errors.phone ? 'var(--danger)' : 'var(--neutral-200)' }}
                  />
                </div>
                {errors.phone && <p className={errorCls} style={{ color: 'var(--danger)' }}>{errors.phone.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Địa chỉ giao hàng</label>
                <Controller name="address" control={control} render={({ field }) => (
                  <VietnamAddressPicker value={field.value} onChange={field.onChange} />
                )} />
                {errors.address && <p className={errorCls} style={{ color: 'var(--danger)' }}>{errors.address.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Ghi chú cho đơn hàng (tuỳ chọn)</label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3.5 top-[18px] text-neutral-400" />
                  <input {...register('note')} className={`${inputWithIconCls} border-neutral-200`} />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 md:p-8">
            <h2 className="text-lg md:text-xl font-extrabold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                <CreditCard size={20} />
              </div>
              Phương thức thanh toán
            </h2>
            <div className="flex flex-col gap-3">
              <label className={paymentOptionCls(paymentMethod === 'cod')}>
                <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5" style={{ accentColor: 'var(--primary-600)' }} />
                <div className="flex-1">
                  <div className="font-bold text-[15px]">Thanh toán khi nhận hàng (COD)</div>
                  <div className="text-[13px] text-neutral-500">Trả tiền mặt cho shipper khi nhận được hàng</div>
                </div>
              </label>
              <label className={paymentOptionCls(paymentMethod === 'vnpay')}>
                <input type="radio" name="payment" value="vnpay" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} className="w-5 h-5" style={{ accentColor: 'var(--primary-600)' }} />
                <div className="flex-1">
                  <div className="font-bold text-[15px] text-[#005baa]">Ví điện tử VNPay</div>
                  <div className="text-[13px] text-neutral-500">Thanh toán qua app ngân hàng hoặc thẻ ATM/Quốc tế</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="relative lg:sticky lg:top-24 order-first lg:order-last">
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 md:p-7">
            <h3 className="text-[18px] font-extrabold mb-5 flex justify-between items-center cursor-pointer lg:cursor-auto"
              onClick={() => setIsSummaryOpen(!isSummaryOpen)}>
              Đơn hàng của bạn
              <span className="lg:hidden text-[14px] font-semibold px-3 py-1.5 rounded-lg" style={{ color: 'var(--primary-600)', background: 'var(--primary-50)' }}>
                {isSummaryOpen ? 'Thu gọn' : 'Chi tiết'}
              </span>
            </h3>
            <div className={`${isSummaryOpen ? 'flex' : 'hidden'} lg:flex flex-col gap-4 mb-6`}>
              {displayItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-4">
                  <span className="text-[13px] text-neutral-600 flex-1">
                    {item.quantity}x {item.product_name}
                    {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                      <span className="block text-[12px] text-neutral-400">
                        {Object.entries(item.variant_attributes).map(([k, v]) => `${k}: ${v}`).join(" / ")}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] font-semibold text-neutral-900">{((item.sale_price || item.price) * item.quantity).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
            {/* Coupon Code Input */}
            <div className="border-t border-neutral-100 pt-4 mb-4">
              <div className="text-[13px] font-bold mb-2 flex items-center justify-between">
                <span>Mã giảm giá (tối đa 2 mã)</span>
                <span className="text-[11px] text-neutral-400 font-normal">1 sản phẩm + 1 vận chuyển</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá..."
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-[10px] text-[13px] outline-none focus:border-[var(--primary-500)]"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-[10px] text-[13px] font-bold hover:bg-neutral-800 transition-colors"
                >
                  Áp dụng
                </button>
              </div>
              {appliedCodes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in duration-200">
                  {appliedCodes.map((code) => {
                    const detail = couponDetails.find(d => d.code === code);
                    const typeText = detail?.promo_type === 'shipping' ? 'Vận chuyển' : 'Sản phẩm';
                    return (
                      <div
                        key={code}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--primary-50)] border border-[var(--primary-100)] rounded-lg text-[12px] font-medium text-[var(--primary-700)] shadow-sm"
                      >
                        <span>{code} ({typeText})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoupon(code)}
                          className="hover:text-[var(--danger)] transition-colors p-0.5 rounded-full hover:bg-[var(--primary-100)]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 pt-4 flex flex-col gap-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-neutral-500">Tạm tính</span>
                <span className="font-semibold">{subtotal.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-neutral-500">Phí vận chuyển</span>
                <span className="font-semibold">30,000đ</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[14px]" style={{ color: 'var(--success)' }}>
                  <span>Giảm giá sản phẩm</span>
                  <span className="font-semibold">-{discountAmount.toLocaleString()}đ</span>
                </div>
              )}
              {shippingDiscountAmount > 0 && (
                <div className="flex justify-between text-[14px]" style={{ color: 'var(--success)' }}>
                  <span>Giảm giá vận chuyển</span>
                  <span className="font-semibold">-{shippingDiscountAmount.toLocaleString()}đ</span>
                </div>
              )}
              <div className="border-t border-neutral-100 mt-2 pt-4 flex justify-between items-baseline">
                <span className="text-[16px] font-extrabold">Tổng cộng</span>
                <span className="text-[24px] font-extrabold" style={{ color: 'var(--primary-600)' }}>{total.toLocaleString()}đ</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl text-base font-bold text-white mt-6 md:mt-8 flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
              style={{ background: 'var(--primary-600)' }}
            >
              {isSubmitting ? <><Spinner size={18} /> Đang xử lý...</> : "Xác nhận đặt hàng"}
            </button>
            <div className="flex items-center justify-center gap-2 mt-6 text-neutral-400 text-[12px]">
              <ShieldCheck size={14} /> Thanh toán an toàn & bảo mật
            </div>
            <p className="mt-3 text-center text-[11px] leading-5 text-neutral-400">
              Khi đặt hàng, bạn đồng ý với{' '}
              <Link href="/dieu-khoan-mua-ban" className="underline">điều khoản mua bán</Link>
              {' '}và{' '}
              <Link href="/chinh-sach-bao-mat" className="underline">chính sách bảo mật</Link>.
            </p>
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
