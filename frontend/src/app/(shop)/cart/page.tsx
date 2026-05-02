"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Trash2, Plus, Minus, ChevronRight, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { getGuestCart, GuestCartItem } from '@/lib/guestCart';
import Image from 'next/image';
import { CartRowSkeleton } from "@/components/skeletons/CartRowSkeleton";
import { EmptyState } from '@/components/ui/empty-state';
interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  price: number;
  sale_price?: number;
}

// ─── Guest cart ───────────────────────────────────────────────────────────────

function GuestCartPage() {
  const router = useRouter();
  const [guestRaw, setGuestRaw] = useState<GuestCartItem[]>([]);
  const [products, setProducts] = useState<Record<string, { name: string; price: number; sale_price?: number; image?: string }>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const items = getGuestCart();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuestRaw(items);
    setSelectedIds(new Set(items.map(i => i.product_id)));
    if (items.length === 0) return;
    Promise.all(
      items.map(i =>
        api.get(`/products/${i.slug}`).then(r => ({
          id: i.product_id,
          data: { name: r.data.name, price: r.data.price, sale_price: r.data.sale_price ?? undefined, image: r.data.images?.main },
        }))
      )
    ).then(results => {
      const map: Record<string, { name: string; price: number; sale_price?: number; image?: string }> = {};
      results.forEach(r => { map[r.id] = r.data; });
      setProducts(map);
    }).catch(() => {});
  }, []);

  const updateQty = (product_id: string, delta: number) => {
    setGuestRaw(prev => {
      const next = prev.map(i => i.product_id === product_id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i);
      localStorage.setItem('guest_cart', JSON.stringify(next));
      return next;
    });
  };

  const removeItem = (product_id: string) => {
    setGuestRaw(prev => {
      const next = prev.filter(i => i.product_id !== product_id);
      localStorage.setItem('guest_cart', JSON.stringify(next));
      setSelectedIds(s => { const n = new Set(s); n.delete(product_id); return n; });
      return next;
    });
  };

  const items: CartItem[] = guestRaw.map(i => ({
    id: i.product_id,
    product_id: i.product_id,
    product_name: products[i.product_id]?.name ?? '...',
    product_image: products[i.product_id]?.image,
    quantity: i.quantity,
    price: products[i.product_id]?.price ?? 0,
    sale_price: products[i.product_id]?.sale_price,
  }));

  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map(i => i.id)));
  const toggleItem = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + (i.sale_price || i.price) * i.quantity, 0);

  const handleCheckout = () => {
    if (selectedIds.size === 0) return;
    // Write only selected items to guest cart before going to checkout
    const selected = guestRaw.filter(i => selectedIds.has(i.product_id));
    localStorage.setItem('guest_cart', JSON.stringify(selected));
    setGuestRaw(selected);
    router.push('/checkout');
  };

  return <CartLayout items={items} selectedIds={selectedIds} selectedTotal={selectedTotal} allSelected={allSelected}
    toggleAll={toggleAll} toggleItem={toggleItem} handleCheckout={handleCheckout}
    onUpdateQty={(id, delta) => updateQty(id, delta)}
    onRemove={removeItem} isGuest />;
}

// ─── Auth cart ────────────────────────────────────────────────────────────────

function AuthCartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/cart/');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      await api.put(`/cart/items/${id}`, { quantity });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/cart/items/${id}`); },
    onSuccess: (_, id) => {
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const items: CartItem[] = useMemo(() => cart?.items || [], [cart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (items.length > 0) setSelectedIds(new Set(items.map((i: CartItem) => i.id)));
  }, [items]);

  if (isLoading) return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <div className="flex flex-col gap-4">
        {[...Array(3)].map((_, i) => <CartRowSkeleton key={i} />)}
      </div>
    </div>
  );

  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map(i => i.id)));
  const toggleItem = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + (i.sale_price || i.price) * i.quantity, 0);

  const handleCheckout = () => {
    if (selectedIds.size === 0) return;
    const params = new URLSearchParams();
    selectedIds.forEach(id => params.append('items', id));
    router.push(`/checkout?${params.toString()}`);
  };

  return <CartLayout items={items} selectedIds={selectedIds} selectedTotal={selectedTotal} allSelected={allSelected}
    toggleAll={toggleAll} toggleItem={toggleItem} handleCheckout={handleCheckout}
    onUpdateQty={(id, delta) => {
      const item = items.find(i => i.id === id);
      if (item) updateMutation.mutate({ id, quantity: Math.max(1, item.quantity + delta) });
    }}
    onRemove={id => deleteMutation.mutate(id)} />;
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function CartLayout({ items, selectedIds, selectedTotal, allSelected, toggleAll, toggleItem, handleCheckout, onUpdateQty, onRemove, isGuest }: {
  items: CartItem[];
  selectedIds: Set<string>;
  selectedTotal: number;
  allSelected: boolean;
  toggleAll: () => void;
  toggleItem: (id: string) => void;
  handleCheckout: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  isGuest?: boolean;
}) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 pb-[280px] md:pb-8 md:py-8">
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6 md:mb-8">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Giỏ hàng</span>
      </div>

      <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight mb-6 md:mb-8">Giỏ hàng của bạn</h1>

      {isGuest && (
        <div className="mb-6 px-4 py-3 rounded-2xl text-sm flex items-center gap-3" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>
          Bạn đang mua hàng với tư cách khách.&nbsp;
          <Link href="/login" className="font-bold underline" style={{ color: 'var(--primary-700)' }}>Đăng nhập</Link>
          &nbsp;để lưu giỏ hàng và theo dõi đơn hàng.
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={32} />}
          title="Giỏ hàng trống"
          description="Bạn chưa thêm sản phẩm nào vào giỏ hàng. Khám phá cửa hàng ngay!"
          actionLabel="Tiếp tục mua sắm"
          actionHref="/shop"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0 4px' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                style={{ width: 18, height: 18, accentColor: 'var(--primary-600)', cursor: 'pointer' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-700)' }}>Chọn tất cả ({items.length} sản phẩm)</span>
            </label>

            {items.map((item) => (
              <div key={item.id} className="card p-3 md:p-5" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleItem(item.id)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary-600)', cursor: 'pointer', flexShrink: 0 }} />
                <div className="w-[70px] h-[70px] md:w-[100px] md:h-[100px]" style={{ borderRadius: 12, background: 'var(--neutral-50)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                  {item.product_image ? (
                    <Image src={item.product_image} alt={item.product_name} fill sizes="100px" className="object-cover" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-300)', fontSize: 10 }}>NO IMG</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 className="text-sm md:text-base" style={{ fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>{item.product_name}</h3>
                    <button onClick={() => onRemove(item.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--neutral-400)', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--neutral-400)'}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3 md:mt-4">
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary-600)' }}>{(item.sale_price || item.price).toLocaleString()}đ</div>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-50)', borderRadius: 10, padding: 2 }}>
                      <button onClick={() => onUpdateQty(item.id, -1)}
                        style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={14} />
                      </button>
                      <span style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.quantity}</span>
                      <button onClick={() => onUpdateQty(item.id, 1)}
                        style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border-0 md:border md:border-neutral-100 p-5 md:p-7 fixed bottom-[60px] md:bottom-auto left-0 right-0 z-40 md:relative lg:sticky lg:top-24 rounded-t-[24px] rounded-b-none md:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.08)] md:shadow-none flex flex-col gap-3 md:gap-0">
            <h3 className="hidden md:block" style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, color: 'var(--neutral-900)' }}>Tổng quan đơn hàng</h3>
            <div className="hidden md:flex" style={{ flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--neutral-600)' }}>
                <span>Tạm tính ({selectedIds.size} sản phẩm đã chọn)</span>
                <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{selectedTotal.toLocaleString()}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--neutral-600)' }}>
                <span>Phí vận chuyển</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>30,000đ</span>
              </div>
              <div style={{ height: 1, background: 'var(--neutral-100)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Tổng cộng</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-600)' }}>{selectedTotal.toLocaleString()}đ</span>
              </div>
            </div>

            <div className="md:hidden flex justify-between items-center" style={{ height: 52 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Tổng cộng</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-600)' }}>{selectedTotal.toLocaleString()}đ</span>
            </div>

            <button onClick={handleCheckout} disabled={selectedIds.size === 0}
              className="btn btn-primary btn-lg w-full md:mt-8"
              style={{ height: 52, borderRadius: 14, opacity: selectedIds.size === 0 ? 0.5 : 1, cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700 }}>
              Thanh toán ({selectedIds.size} sản phẩm)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function CartPage() {
  const { user } = useAuthStore();
  return user ? <AuthCartPage /> : <GuestCartPage />;
}
