"use client";
import React, { useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/lib/types';
import BannerCarousel from '@/components/BannerCarousel';



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

const ProductCardSmall = ({ product }: { product: Product }) => (
  <Link href={`/products/${product.slug}`} className="w-[130px] md:w-[150px] flex-shrink-0" style={{ textDecoration: 'none', color: 'inherit', scrollSnapAlign: 'start' }}>
    <div className="card group" style={{
      cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%',
      transition: 'transform 160ms ease, box-shadow 160ms ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--neutral-50)', overflow: 'hidden' }}>
        {product.images?.main ? (
          <Image
            src={product.images.main}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
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

const CarouselRow = ({ items }: { items: Product[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });

  if (!items?.length) return <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13 }}>Chưa có sản phẩm</div>;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => scroll(-1)} className="hidden md:flex" style={{
        position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
        width: 36, height: 36, borderRadius: 18, background: 'white', border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
        color: 'var(--neutral-700)',
      }}>
        <ChevronLeft size={18} />
      </button>
      <div ref={ref} style={{
        display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none', padding: '4px 4px 8px',
      }}>
        {items.map((p: Product) => <ProductCardSmall key={p.id} product={p} />)}
      </div>
      <button onClick={() => scroll(1)} className="hidden md:flex" style={{
        position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
        width: 36, height: 36, borderRadius: 18, background: 'white', border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center',
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
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Pet Recommendations (logged-in users with pets) */}
      {user && recommendations?.items?.length > 0 && (
        <section className="px-4 md:px-12 pt-12">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 className="text-xl md:text-2xl" style={{ fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Gợi ý cho bé của bạn</h2>
              <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Sản phẩm phù hợp với loài thú cưng bạn đang nuôi</p>
            </div>
            <Link href="/shop" className="hidden sm:flex" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', alignItems: 'center', gap: 4 }}>Xem tất cả <ArrowRight size={14} /></Link>
          </div>
          <CarouselRow items={recommendations.items} />
        </section>
      )}

      {/* Best Sellers */}
      <section className="px-4 md:px-12 pt-12">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 className="text-xl md:text-2xl" style={{ fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Bán chạy tuần này</h2>
            <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Những sản phẩm được yêu thích nhất trong 7 ngày qua</p>
          </div>
          <Link href="/shop" className="hidden sm:flex" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', alignItems: 'center', gap: 4 }}>Xem tất cả <ArrowRight size={14} /></Link>
        </div>
        <CarouselRow items={bestSellers?.items || []} />
      </section>

      {/* New Arrivals */}
      <section className="px-4 md:px-12 py-12">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 className="text-xl md:text-2xl" style={{ fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Mới về tuần này</h2>
            <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Sản phẩm vừa được cập nhật tại cửa hàng trong tuần này</p>
          </div>
          <Link href="/shop" className="hidden sm:flex" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', alignItems: 'center', gap: 4 }}>Xem tất cả <ArrowRight size={14} /></Link>
        </div>
        <CarouselRow items={newArrivals?.items || []} />
      </section>
    </div>
  );
}
