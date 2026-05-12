"use client";
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getGuestCart, clearGuestCart, getGuestCartItemKey, GuestCartItem } from '@/lib/guestCart';
import { ChevronRight, CreditCard, Truck, ShieldCheck, Phone, User as UserIcon, MessageSquare } from 'lucide-react';
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

const checkoutSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z.string().min(1, 'Vui lòng nhập số điện thoại').regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(1, 'Vui lòng chọn địa chỉ'),
  note: z.string().optional(),
  guestEmail: z.string().optional(),
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
  const total = subtotal + 30000;

  const onSubmit = async (data: CheckoutForm) => {
    try {
      let order;
      if (isGuest) {
        const res = await api.post('/orders/guest-checkout', {
          ship_name: data.name, ship_phone: data.phone, ship_address: data.address,
          note: data.note, guest_email: data.guestEmail, payment_method: paymentMethod, items: guestItems,
        });
        order = res.data;
        clearGuestCart();
      } else {
        const res = await api.post('/orders/checkout', {
          ship_name: data.name, ship_phone: data.phone, ship_address: data.address,
          note: data.note, payment_method: paymentMethod,
          ...(selectedItemIds.length > 0 ? { item_ids: selectedItemIds } : {})
        });
        order = res.data;
      }
      if (paymentMethod === 'vnpay') {
        const vnpRes = await api.post(`/payments/vnpay/create/${order.id}`);
        window.location.assign(vnpRes.data.payment_url);
      } else {
        toast.success('Đặt hàng thành công!');
        router.push(`/orders/${order.id}?guest=1&order_code=${order.order_code}`);
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
    `flex items-center gap-3 px-4 py-3 rounded-2xl border-[1.5px] cursor-pointer transition-all duration-[120ms] ${active ? 'border-[var(--primary-500)] bg-[var(--primary-25)]' : 'border-neutral-100 bg-white'}`;

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
            <div className="border-t border-neutral-100 pt-4 flex flex-col gap-3">
              <div className="flex justify-between text-[14px]">
                <span className="text-neutral-500">Tạm tính</span>
                <span className="font-semibold">{subtotal.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-neutral-500">Phí vận chuyển</span>
                <span className="font-semibold">30,000đ</span>
              </div>
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
