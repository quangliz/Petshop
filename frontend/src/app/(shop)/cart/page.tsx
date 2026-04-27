"use client";
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Trash2, Plus, Minus, ChevronRight, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function CartPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/cart');
      return res.data;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      await api.put(`/cart/items/${id}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cart/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  if (!user) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--neutral-400)' }}>
          <ShoppingBag size={40} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Vui lòng đăng nhập</h2>
        <p style={{ color: 'var(--neutral-500)', marginBottom: 32 }}>Bạn cần đăng nhập để xem giỏ hàng và thanh toán</p>
        <Link href="/login" className="btn btn-primary btn-lg">Đăng nhập ngay</Link>
      </div>
    );
  }

  if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải giỏ hàng...</div>;

  const items = cart?.items || [];
  const total = cart?.total_amount || 0;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 pb-[280px] md:pb-8 md:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6 md:mb-8">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Giỏ hàng</span>
      </div>

      <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight mb-6 md:mb-8">Giỏ hàng của bạn</h1>
      
      {items.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-3xl border border-dashed border-neutral-200">
          <p style={{ color: 'var(--neutral-500)', marginBottom: 24 }}>Giỏ hàng của bạn đang trống.</p>
          <Link href="/shop" className="btn btn-outline">Tiếp tục mua sắm</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((item: any) => (
              <div key={item.id} className="card" style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: 12, background: 'var(--neutral-50)', overflow: 'hidden' }}>
                   {item.product_image ? (
                     <img src={item.product_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   ) : (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-300)', fontSize: 10 }}>NO IMG</div>
                   )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>{item.product_name}</h3>
                    <button 
                      onClick={() => deleteMutation.mutate(item.id)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--neutral-400)', padding: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--neutral-400)'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>Chó con · 1.5kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary-600)' }}>{(item.sale_price || item.price).toLocaleString()}đ</div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--neutral-50)', borderRadius: 10, padding: 2 }}>
                      <button 
                        onClick={() => updateMutation.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) })}
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.quantity}</span>
                      <button 
                        onClick={() => updateMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="card p-6 md:p-7 fixed bottom-0 left-0 right-0 z-40 md:relative lg:sticky lg:top-24 rounded-t-[32px] md:rounded-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.08)] md:shadow-none">
            <h3 className="hidden md:block" style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, color: 'var(--neutral-900)' }}>Tổng quan đơn hàng</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="hidden md:flex" style={{ justifyContent: 'space-between', fontSize: 14, color: 'var(--neutral-600)' }}>
                <span>Tạm tính ({items.length} sản phẩm)</span>
                <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{total.toLocaleString()}đ</span>
              </div>
              <div className="hidden md:flex" style={{ justifyContent: 'space-between', fontSize: 14, color: 'var(--neutral-600)' }}>
                <span>Phí vận chuyển</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>Miễn phí</span>
              </div>
              <div className="hidden md:block" style={{ height: 1, background: 'var(--neutral-100)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Tổng cộng</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-600)' }}>{total.toLocaleString()}đ</span>
              </div>
            </div>
            <Link href="/checkout" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary btn-lg mt-5 md:mt-8 w-full h-14 rounded-2xl text-base">Tiến hành thanh toán</button>
            </Link>
            <p className="hidden md:block" style={{ fontSize: 12, color: 'var(--neutral-400)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
              Bằng cách nhấn nút, bạn đồng ý với các Điều khoản & Chính sách bảo mật của ThePawsome.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
