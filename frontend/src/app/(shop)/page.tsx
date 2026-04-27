"use client";
import React, { useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { PawPrint, Sparkles, ArrowRight, MessageSquare, Star, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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

const ProductCardSmall = ({ product }: { product: any }) => (
  <Link href={`/products/${product.slug}`} className="w-[130px] md:w-[150px] flex-shrink-0" style={{ textDecoration: 'none', color: 'inherit', scrollSnapAlign: 'start' }}>
    <div className="card" style={{
      cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%',
      transition: 'transform 160ms ease, box-shadow 160ms ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--neutral-50)' }}>
        {product.images?.main ? (
          <img src={product.images.main} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, var(--neutral-100), var(--neutral-100) 8px, var(--neutral-50) 8px, var(--neutral-50) 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', fontSize: 9, fontFamily: 'var(--font-mono)' }}>NO IMAGE</div>
        )}
        {product.sale_price && (
          <span className="badge badge-sale" style={{ position: 'absolute', top: 8, left: 8, fontSize: 9 }}>-{Math.round((1 - product.sale_price / product.price) * 100)}%</span>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.brand || "LOCAL BRAND"}</div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--neutral-800)', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: 32,
        }}>{product.name}</div>
        <Rating value={4.5} count={12} size={10} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 'auto', paddingTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-600)' }}>{(product.sale_price || product.price).toLocaleString()}đ</span>
          {product.sale_price && <span style={{ fontSize: 11, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{product.price.toLocaleString()}đ</span>}
        </div>
      </div>
    </div>
  </Link>
);

const CarouselRow = ({ items }: { items: any[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });

  if (!items?.length) return <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13 }}>Chưa có sản phẩm</div>;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => scroll(-1)} style={{
        position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
        width: 36, height: 36, borderRadius: 18, background: 'white', border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--neutral-700)',
      }}>
        <ChevronLeft size={18} />
      </button>
      <div ref={ref} style={{
        display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none', padding: '4px 4px 8px',
      }}>
        {items.map((p: any) => <ProductCardSmall key={p.id} product={p} />)}
      </div>
      <button onClick={() => scroll(1)} style={{
        position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
        width: 36, height: 36, borderRadius: 18, background: 'white', border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--neutral-700)',
      }}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default function Home() {
  const { user } = useAuthStore();

  const { data: bestSellers } = useQuery({
    queryKey: ['best-sellers'],
    queryFn: async () => {
      const res = await api.get('/products/best-sellers?limit=8');
      return res.data;
    }
  });

  const { data: newArrivals } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: async () => {
      const res = await api.get('/products/new-arrivals?limit=8');
      return res.data;
    }
  });

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await api.get('/products/recommendations?limit=8');
      return res.data;
    },
    enabled: !!user,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Hero Section */}
      <section className="mx-4 md:mx-8 mt-6 px-6 py-10 md:p-14" style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, oklch(0.97 0.025 55) 0%, oklch(0.95 0.04 30) 60%, oklch(0.96 0.04 85) 100%)',
        borderRadius: 28,
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'oklch(0.93 0.08 50 / 0.5)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: '40%', width: 220, height: 220, borderRadius: '50%', background: 'oklch(0.92 0.07 195 / 0.4)', filter: 'blur(50px)' }} />

        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-8 md:gap-10 items-center relative">
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px',
              background: 'white', borderRadius: 999, fontSize: 12, fontWeight: 600,
              color: 'var(--neutral-700)', boxShadow: 'var(--shadow-sm)', marginBottom: 22,
            }}>
              <span style={{ background: 'var(--teal-600)', color: 'white', padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>MỚI</span>
              Trợ lý AI hiểu từng bé pet của bạn
            </div>
            <h1 className="text-[40px] md:text-[60px]" style={{
              fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.035em',
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

          <div className="relative h-[320px] md:h-[440px] flex justify-center w-full mt-8 md:mt-0">
            <div className="relative md:absolute top-0 md:top-5 right-0 md:right-5 w-[280px] md:w-[320px] h-[320px] md:h-[400px]" style={{
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

      {/* Pet Recommendations (logged-in users with pets) */}
      {user && recommendations?.items?.length > 0 && (
        <section className="px-4 md:px-12 pt-12">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Gợi ý cho bé của bạn</h2>
              <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Sản phẩm phù hợp với loài thú cưng bạn đang nuôi</p>
            </div>
            <Link href="/shop" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Xem tất cả <ArrowRight size={14} /></Link>
          </div>
          <CarouselRow items={recommendations.items} />
        </section>
      )}

      {/* Best Sellers */}
      <section className="px-4 md:px-12 pt-12">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Bán chạy tuần này</h2>
            <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Những sản phẩm được yêu thích nhất trong 7 ngày qua</p>
          </div>
          <Link href="/shop" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Xem tất cả <ArrowRight size={14} /></Link>
        </div>
        <CarouselRow items={bestSellers?.items || []} />
      </section>

      {/* New Arrivals */}
      <section className="px-4 md:px-12 py-12">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Mới về tuần này</h2>
            <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Sản phẩm vừa được cập nhật tại cửa hàng trong tuần này</p>
          </div>
          <Link href="/shop" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Xem tất cả <ArrowRight size={14} /></Link>
        </div>
        <CarouselRow items={newArrivals?.items || []} />
      </section>
    </div>
  );
}
