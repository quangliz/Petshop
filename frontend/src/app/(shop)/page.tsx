"use client";
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PawPrint, Sparkles, ArrowRight, MessageSquare, Star, Search, Plus } from 'lucide-react';

const Icon = ({ name, size = 18 }: { name: string, size?: number }) => {
  switch (name) {
    case 'paw': return <PawPrint size={size} />;
    case 'sparkles': return <Sparkles size={size} />;
    case 'arrowR': return <ArrowRight size={size} />;
    case 'chat': return <MessageSquare size={size} />;
    case 'star': return <Star size={size} />;
    case 'search': return <Search size={size} />;
    case 'plus': return <Plus size={size} />;
    default: return null;
  }
};

const Rating = ({ value, size = 12, count }: { value: number, size?: number, count?: number }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: size, color: 'oklch(0.75 0.15 75)' }}>
    <div style={{ display: 'inline-flex' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} size={size + 2} fill={i < Math.round(value) ? "currentColor" : "none"} />
      ))}
    </div>
    {count != null && <span style={{ color: 'var(--neutral-500)', fontSize: size }}>({count})</span>}
  </div>
);

const ProductCard = ({ product }: { product: any }) => (
  <Link href={`/products/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
    <div className="card" style={{
      cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 160ms ease, box-shadow 160ms ease', height: '100%'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--neutral-50)' }}>
        {product.images?.main ? (
          <img src={product.images.main} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, var(--neutral-100), var(--neutral-100) 8px, var(--neutral-50) 8px, var(--neutral-50) 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>NO IMAGE</div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {product.sale_price && (
            <span className="badge badge-sale">-{Math.round((1 - product.sale_price / product.price) * 100)}%</span>
          )}
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.brand || "LOCAL BRAND"}</div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--neutral-800)', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: 38
        }}>{product.name}</div>
        <Rating value={4.5} count={12} size={11} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary-600)' }}>{(product.sale_price || product.price).toLocaleString()}đ</span>
          {product.sale_price && <span style={{ fontSize: 12, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{product.price.toLocaleString()}đ</span>}
        </div>
      </div>
    </div>
  </Link>
);

export default function Home() {
  const { data: productsData } = useQuery({
    queryKey: ['best-sellers'],
    queryFn: async () => {
      const res = await api.get('/products/?size=8');
      return res.data;
    }
  });

  const categories = [
    { id: 'food', name: 'Thức ăn', emoji: '🍖', count: 184 },
    { id: 'toys', name: 'Đồ chơi', emoji: '🎾', count: 92 },
    { id: 'litter', name: 'Cát vệ sinh', emoji: '🪴', count: 28 },
    { id: 'health', name: 'Sức khoẻ', emoji: '💊', count: 67 },
    { id: 'grooming', name: 'Chăm lông', emoji: '✂️', count: 45 },
    { id: 'accessory', name: 'Phụ kiện', emoji: '🎀', count: 136 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Hero Section */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, oklch(0.97 0.025 55) 0%, oklch(0.95 0.04 30) 60%, oklch(0.96 0.04 85) 100%)',
        borderRadius: 28, margin: '24px 32px 0', padding: '56px 56px',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'oklch(0.93 0.08 50 / 0.5)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: '40%', width: 220, height: 220, borderRadius: '50%', background: 'oklch(0.92 0.07 195 / 0.4)', filter: 'blur(50px)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 40, alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px',
              background: 'white', borderRadius: 999, fontSize: 12, fontWeight: 600,
              color: 'var(--neutral-700)', boxShadow: 'var(--shadow-sm)', marginBottom: 22,
            }}>
              <span style={{ background: 'var(--teal-600)', color: 'white', padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>MỚI</span>
              Trợ lý AI hiểu từng bé pet của bạn
            </div>
            <h1 style={{
              fontSize: 60, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.035em',
              color: 'var(--neutral-900)', margin: '0 0 20px',
            }}>
              Thú cưng của bạn,<br/>
              <span style={{ color: 'var(--primary-600)', position: 'relative' }}>
                AI hiểu từng chi tiết
                <svg viewBox="0 0 200 12" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10, opacity: 0.35 }}>
                  <path d="M2 8 Q 50 2, 100 6 T 198 5" stroke="var(--primary-500)" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--neutral-600)', maxWidth: 480, margin: '0 0 32px' }}>
              Tạo hồ sơ cho bé pet — chúng tôi gợi ý sản phẩm phù hợp với tuổi, cân nặng, giống và cả dị ứng của bé. Chat 24/7 với trợ lý AI khi bạn cần tư vấn.
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              <Link href="/profile" className="btn btn-primary btn-lg"><Icon name="paw" size={16} /> Tạo hồ sơ pet</Link>
              <button className="btn btn-outline btn-lg"><Icon name="sparkles" size={16} /> Thử chat AI</button>
            </div>
            <div style={{ display: 'flex', gap: 28, fontSize: 12, color: 'var(--neutral-600)' }}>
              {[
                { n: '15K+', l: 'Khách hàng' },
                { n: '2.4K', l: 'Sản phẩm' },
                { n: '4.8★', l: 'Đánh giá' },
                { n: '24/7', l: 'AI hỗ trợ' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>{s.n}</div>
                  <div>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', height: 440 }}>
            <div style={{
              position: 'absolute', top: 20, right: 20, width: 320, height: 400,
              borderRadius: 24, background: 'white', boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden', transform: 'rotate(3deg)', border: '1px solid var(--neutral-100)'
            }}>
              <div style={{ height: '100%', width: '100%', background: 'oklch(0.95 0.05 55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🐈</div>
              <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: 'oklch(0.85 0.08 50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🐈</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Miu · 3 tháng</div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>Anh lông ngắn · 2.1kg</div>
                </div>
                <div style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>ĐANG KHOẺ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Section */}
      <section style={{ padding: '56px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Danh mục nổi bật</h2>
          <Link href="/shop" style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>Xem tất cả <Icon name="arrowR" size={14} /></Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
          {categories.map((c, i) => (
            <Link key={c.id} href="/shop" style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                padding: '22px 14px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 10, cursor: 'pointer',
                transition: 'all 160ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-200)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = ''; }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 18,
                  background: i % 2 === 0 ? 'oklch(0.95 0.05 55)' : 'oklch(0.93 0.06 195)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>{c.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{c.count} sản phẩm</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Best Sellers Section */}
      <section style={{ padding: '56px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Sản phẩm mới nhất</h2>
            <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Những sản phẩm vừa được cập nhật tại cửa hàng</p>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'white', borderRadius: 10, border: '1px solid var(--neutral-100)' }}>
            <button style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, background: 'var(--neutral-900)', color: 'white' }}>Tất cả</button>
            <button style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: 'var(--neutral-600)' }}>Chó</button>
            <button style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: 'var(--neutral-600)' }}>Mèo</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {productsData?.items?.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* AI Banner Section */}
      <section style={{ padding: '72px 32px 0' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--neutral-900) 0%, oklch(0.25 0.05 190) 60%, var(--teal-700) 100%)',
          borderRadius: 28, padding: '48px 56px', color: 'white', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'oklch(0.62 0.12 195 / 0.2)', filter: 'blur(40px)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'center', position: 'relative' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                <Icon name="sparkles" size={12} /> TRỢ LÝ AI 24/7
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
                Bé pet khoẻ, bạn nhàn.<br/>
                <span style={{ color: 'var(--teal-500)' }}>Hỏi AI bất cứ lúc nào.</span>
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', maxWidth: 420, margin: '0 0 28px' }}>
                Từ chọn thức ăn đúng cân nặng, lịch tiêm phòng, đến xử lý tình huống khẩn cấp — AI hiểu hồ sơ pet của bạn và gợi ý chính xác.
              </p>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 26px',
                background: 'white', color: 'var(--neutral-900)', border: 'none', borderRadius: 999,
                fontSize: 15, fontWeight: 700, boxShadow: '0 8px 20px rgba(0,0,0,0.2)', cursor: 'pointer'
              }}>
                <Icon name="sparkles" size={16} /> Thử chat AI ngay →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { q: 'Miu 3 tháng nên ăn hạt gì?', t: 'Mèo con' },
                { q: 'Lucky golden nên tẩy giun bao lâu 1 lần?', t: 'Chó' },
                { q: 'Cát đậu hũ có dùng được cho mèo con không?', t: 'Vệ sinh' },
              ].map((q, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="chat" size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'white' }}>{q.q}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{q.t}</div>
                  </div>
                  <Icon name="arrowR" size={14} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
