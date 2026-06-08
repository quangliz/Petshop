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
import {
  buildCategoryFilterHref,
  CAT_CATEGORY_SLUG,
  CAT_SHOP_CATEGORY_SLUGS,
  DOG_CATEGORY_SLUG,
  DOG_SHOP_CATEGORY_SLUGS,
} from '@/lib/shopFilters';

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
    className="w-[130px] md:w-[150px] shrink-0 no-underline text-inherit"
    style={{ scrollSnapAlign: 'start' }}
  >
    <div
      className="group cursor-pointer overflow-hidden flex flex-col h-full bg-white border border-neutral-100 rounded-[16px] shadow-xs transition-[transform,box-shadow] duration-160 ease-ease hover:-translate-y-0.5 hover:shadow-md"
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
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[9px] font-mono"
            style={{ background: 'repeating-linear-gradient(45deg, var(--neutral-100), var(--neutral-100) 8px, var(--neutral-50) 8px, var(--neutral-50) 16px)' }}>
            NO IMAGE
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
        <Rating value={product.avg_rating || 0} count={product.review_count || 0} size={10} />
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
  const dogShopHref = buildCategoryFilterHref(DOG_SHOP_CATEGORY_SLUGS);
  const catShopHref = buildCategoryFilterHref(CAT_SHOP_CATEGORY_SLUGS);

  const { data: dogProducts } = useQuery({
    queryKey: ['products-dog'],
    queryFn: async () => { const res = await api.get(`/products/?category_slug=${DOG_CATEGORY_SLUG}&size=20`); return res.data; }
  });
  const { data: catProducts } = useQuery({
    queryKey: ['products-cat'],
    queryFn: async () => { const res = await api.get(`/products/?category_slug=${CAT_CATEGORY_SLUG}&size=20`); return res.data; }
  });
  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => { const res = await api.get('/products/recommendations?limit=20'); return res.data; },
    enabled: !!user,
  });

  return (
    <div className="flex flex-col pb-20">
      <BannerCarousel />

      {user && recommendations?.items?.length > 0 && (
        <section className="px-4 md:px-12 pt-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.025em] m-0">Dành cho Pet của bạn</h2>
              <p className="text-[14px] text-neutral-600 mt-1 mb-0">Sản phẩm phù hợp với loài thú cưng bạn đang nuôi</p>
            </div>
            <Link href="/shop" className="hidden sm:flex items-center gap-1 text-[13px] font-semibold no-underline" style={{ color: 'var(--primary-600)' }}>Xem tất cả <ArrowRight size={14} /></Link>
          </div>
          <CarouselRow items={recommendations.items} />
        </section>
      )}

      <section className="px-4 md:px-12 pt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.025em] m-0">Dành cho Chó</h2>
            <p className="text-[14px] text-neutral-600 mt-1 mb-0">Các sản phẩm dinh dưỡng và phụ kiện chất lượng cho chó</p>
          </div>
          <Link href={dogShopHref} className="hidden sm:flex items-center gap-1 text-[13px] font-semibold no-underline" style={{ color: 'var(--primary-600)' }}>Xem tất cả <ArrowRight size={14} /></Link>
        </div>
        <CarouselRow items={dogProducts?.items || []} />
      </section>

      <section className="px-4 md:px-12 py-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-[-0.025em] m-0">Dành cho Mèo</h2>
            <p className="text-[14px] text-neutral-600 mt-1 mb-0">Thức ăn ngon và đồ chơi hấp dẫn dành cho mèo</p>
          </div>
          <Link href={catShopHref} className="hidden sm:flex items-center gap-1 text-[13px] font-semibold no-underline" style={{ color: 'var(--primary-600)' }}>Xem tất cả <ArrowRight size={14} /></Link>
        </div>
        <CarouselRow items={catProducts?.items || []} />
      </section>
    </div>
  );
}
