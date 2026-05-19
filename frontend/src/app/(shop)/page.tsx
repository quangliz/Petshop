"use client";
import React, { useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { ArrowRight, Star, ChevronLeft, ChevronRight, Truck, HeadphonesIcon, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Product, Category } from '@/lib/types';
import BannerCarousel from '@/components/BannerCarousel';

const CATEGORY_ICONS: Record<string, string> = {
  'thuc-an': '🍖', 'do-choi': '🧸', 'phu-kien': '🎀',
  'cham-soc': '🧴', 'cat-ve-sinh': '🪣', 'chuong-nha': '🏠',
  'thoi-trang': '👕', 'y-te': '💊',
};

const SectionHeader = ({ title, subtitle, href }: { title: string; subtitle: string; href?: string }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
    <div>
      <h2 className="section-accent text-xl md:text-2xl" style={{ fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--neutral-500)', margin: '10px 0 0' }}>{subtitle}</p>
    </div>
    {href && (
      <Link href={href} className="hidden sm:flex items-center gap-1 text-[13px] font-semibold no-underline" style={{ color: 'var(--primary-600)' }}>
        Xem tất cả <ArrowRight size={14} />
      </Link>
    )}
  </div>
);

const ValueProps = () => {
  const items = [
    { icon: <Truck size={20} />, bg: 'var(--primary-50)', color: 'var(--primary-600)', title: 'Miễn phí vận chuyển', desc: 'Đơn hàng từ 300K' },
    { icon: <Sparkles size={20} />, bg: 'var(--teal-50)', color: 'var(--teal-600)', title: 'Trợ lý AI', desc: 'Tư vấn thông minh 24/7' },
    { icon: <ShieldCheck size={20} />, bg: 'var(--success-bg)', color: 'var(--success)', title: 'Chính hãng 100%', desc: 'Cam kết hàng thật' },
    { icon: <HeadphonesIcon size={20} />, bg: 'var(--warning-bg)', color: 'var(--warning)', title: 'Hỗ trợ tận tâm', desc: 'Phản hồi nhanh chóng' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 px-4 md:px-12 mt-8 md:mt-10 animate-fade-in-up delay-200">
      {items.map((item, i) => (
        <div key={i} className="value-prop">
          <div className="value-prop-icon" style={{ background: item.bg, color: item.color }}>
            {item.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-800)' }}>{item.title}</div>
            <div style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 2 }}>{item.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const CategoryNav = ({ categories }: { categories: Category[] }) => {
  if (!categories?.length) return null;
  return (
    <section className="px-4 md:px-12 pt-10 md:pt-12 animate-fade-in-up delay-300">
      <SectionHeader title="Danh mục nổi bật" subtitle="Khám phá sản phẩm theo danh mục" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
        {categories.slice(0, 6).map((cat) => (
          <Link key={cat.id} href={`/shop?category=${cat.slug}`} className="category-chip">
            <div className="category-chip-icon">
              {CATEGORY_ICONS[cat.slug] || '🐾'}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: 'var(--neutral-700)' }}>{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

const Rating = ({ value, size = 12, count }: { value: number, size?: number, count?: number }) => (
  <div className="inline-flex items-center gap-1" style={{ fontSize: size, color: 'oklch(0.75 0.15 75)' }}>
    <div className="inline-flex">
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} size={size + 2} fill={i < Math.round(value) ? "currentColor" : "none"} />
      ))}
    </div>
    {count != null && <span className="text-neutral-500" style={{ fontSize: size }}>({count})</span>}
  </div>
);

const ProductCardSmall = ({ product }: { product: Product }) => (
  <Link
    href={`/products/${product.slug}`}
    className="w-[150px] md:w-[180px] shrink-0 no-underline text-inherit"
    style={{ scrollSnapAlign: 'start' }}
  >
    <div
      className="card-hover group cursor-pointer overflow-hidden flex flex-col h-full bg-white border border-neutral-100 rounded-[16px] shadow-xs"
    >
      <div className="relative aspect-square bg-neutral-50 overflow-hidden">
        {product.images?.main ? (
          <Image
            src={product.images.main}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, var(--neutral-50), var(--neutral-100))' }}>
            🐾
          </div>
        )}
        {product.sale_price && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: 'var(--danger)' }}>
            -{Math.round((1 - product.sale_price / product.price) * 100)}%
          </span>
        )}
      </div>
      <div className="p-[10px_12px_12px] flex flex-col gap-1 flex-1">
        <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-[0.04em]">{product.brand || "LOCAL BRAND"}</div>
        <div className="text-[12px] font-semibold text-neutral-800 leading-[1.35] line-clamp-2 min-h-[32px]">{product.name}</div>
        <Rating value={4.5} count={12} size={10} />
        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
          <span className="text-[14px] font-bold" style={{ color: 'var(--primary-600)' }}>{(product.sale_price || product.price).toLocaleString()}đ</span>
          {product.sale_price && <span className="text-[11px] text-neutral-400 line-through">{product.price.toLocaleString()}đ</span>}
        </div>
      </div>
    </div>
  </Link>
);

const CarouselRow = ({ items }: { items: Product[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });

  if (!items?.length) return <div className="py-8 text-center text-neutral-400 text-[13px]">Chưa có sản phẩm</div>;

  return (
    <div className="relative">
      <button
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-[2] w-9 h-9 rounded-[18px] bg-white border border-neutral-200 items-center justify-center text-neutral-700 cursor-pointer"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <ChevronLeft size={18} />
      </button>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-2 pt-1 px-1"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
      >
        {items.map((p: Product) => <ProductCardSmall key={p.id} product={p} />)}
      </div>
      <button
        onClick={() => scroll(1)}
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-[2] w-9 h-9 rounded-[18px] bg-white border border-neutral-200 items-center justify-center text-neutral-700 cursor-pointer"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default function Home() {
  const { user } = useAuthStore();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const res = await api.get('/categories/'); return res.data; }
  });
  const { data: bestSellers } = useQuery({
    queryKey: ['best-sellers'],
    queryFn: async () => { const res = await api.get('/products/best-sellers?limit=8'); return res.data; }
  });
  const { data: newArrivals } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: async () => { const res = await api.get('/products/new-arrivals?limit=8'); return res.data; }
  });
  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => { const res = await api.get('/products/recommendations?limit=8'); return res.data; },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col pb-20">
      <BannerCarousel />

      <ValueProps />

      <CategoryNav categories={categories || []} />

      {user && recommendations?.items?.length > 0 && (
        <section className="px-4 md:px-12 pt-12 animate-fade-in-up">
          <SectionHeader title="Gợi ý cho Pet của bạn" subtitle="Sản phẩm phù hợp với loài thú cưng bạn đang nuôi" href="/shop" />
          <CarouselRow items={recommendations.items} />
        </section>
      )}

      <section className="px-4 md:px-12 pt-12 animate-fade-in-up delay-100">
        <SectionHeader title="Bán chạy tuần này" subtitle="Những sản phẩm được yêu thích nhất trong 7 ngày qua" href="/shop" />
        <CarouselRow items={bestSellers?.items || []} />
      </section>

      <section className="px-4 md:px-12 py-12 animate-fade-in-up delay-200">
        <SectionHeader title="Mới về tuần này" subtitle="Sản phẩm vừa được cập nhật tại cửa hàng trong tuần này" href="/shop" />
        <CarouselRow items={newArrivals?.items || []} />
      </section>
    </div>
  );
}
