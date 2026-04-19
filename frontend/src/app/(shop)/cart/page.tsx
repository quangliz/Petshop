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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--neutral-500)', marginBottom: 32 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>Giỏ hàng</span>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 32 }}>Giỏ hàng của bạn</h1>
      
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: 'white', borderRadius: 24, border: '1px dashed var(--neutral-200)' }}>
          <p style={{ color: 'var(--neutral-500)', marginBottom: 24 }}>Giỏ hàng của bạn đang trống.</p>
          <Link href="/shop" className="btn btn-outline">Tiếp tục mua sắm</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, alignItems: 'start' }}>
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
          
          <div className="card" style={{ padding: 28, position: 'sticky', top: 100 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, color: 'var(--neutral-900)' }}>Tổng quan đơn hàng</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--neutral-600)' }}>
                <span>Tạm tính ({items.length} sản phẩm)</span>
                <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{total.toLocaleString()}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--neutral-600)' }}>
                <span>Phí vận chuyển</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>Miễn phí</span>
              </div>
              <div style={{ height: 1, background: 'var(--neutral-100)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Tổng cộng</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-600)' }}>{total.toLocaleString()}đ</span>
              </div>
            </div>
            <Link href="/checkout" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 32, height: 56, borderRadius: 16, fontSize: 16 }}>Tiến hành thanh toán</button>
            </Link>
            <p style={{ fontSize: 12, color: 'var(--neutral-400)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
              Bằng cách nhấn nút, bạn đồng ý với các Điều khoản & Chính sách bảo mật của PetShop AI.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
