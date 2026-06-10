"use client";
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { useAuthStore, useViewingProductStore } from '@/lib/store';
import { ShoppingCart, ChevronLeft, ChevronRight, ShieldCheck, Truck, MessageSquare } from 'lucide-react';
import ReviewSection from '@/components/reviews/ReviewSection';
import StarRating from '@/components/reviews/StarRating';
import Image from 'next/image';
import { Product, Variant } from '@/lib/types';
import { ProductDetailSkeleton } from "@/components/skeletons/ProductDetailSkeleton";
import { toast } from 'sonner';
import ProductVariantDrawer from '@/components/ProductVariantDrawer';

type GalleryImage = { url: string; variantId?: string; attributes?: Record<string, string> };

export default function ProductDetailPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('desc');
  const [shouldLoadSimilar, setShouldLoadSimilar] = useState(false);

  const setViewingProduct = useViewingProductStore((s) => s.setViewingProduct);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['product', params.slug],
    queryFn: async () => { const res = await api.get(`/products/${params.slug}`); return res.data; }
  });

  useEffect(() => {
    if (product) setViewingProduct({ id: product.id, slug: product.slug, name: product.name });
    return () => setViewingProduct(null);
  }, [product, setViewingProduct]);

  const variants: Variant[] = useMemo(() => product?.variants ?? [], [product]);
  const hasVariants = variants.length > 0;

  const attrOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const v of variants) {
      for (const [k, val] of Object.entries(v.attributes || {})) {
        if (!map[k]) map[k] = [];
        if (!map[k].includes(val)) map[k].push(val);
      }
    }
    return map;
  }, [variants]);

  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});

  const defaultVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => v.stock_qty > 0) ?? variants[0] ?? null;
  }, [hasVariants, variants]);

  const effectiveSelectedAttrs = useMemo(() => {
    if (!hasVariants) return {};
    return Object.keys(selectedAttrs).length > 0 ? selectedAttrs : (defaultVariant?.attributes ?? {});
  }, [defaultVariant, hasVariants, selectedAttrs]);

  const selectedVariant: Variant | null = useMemo(() => {
    if (!hasVariants) return null;
    const keys = Object.keys(attrOptions);
    if (keys.length === 0) return variants[0] ?? null;
    if (!keys.every((k) => effectiveSelectedAttrs[k])) return null;
    return variants.find((v) => keys.every((k) => v.attributes[k] === effectiveSelectedAttrs[k])) ?? null;
  }, [variants, effectiveSelectedAttrs, attrOptions, hasVariants]);

  const effectivePrice = selectedVariant
    ? (selectedVariant.sale_price ?? selectedVariant.price)
    : (product?.sale_price ?? product?.price ?? 0);
  const originalPrice = selectedVariant ? selectedVariant.price : product?.price ?? 0;
  const effectiveStock = selectedVariant ? selectedVariant.stock_qty : (product?.stock_qty ?? 0);
  // List of all images for the product including variant images and attr images
  const allImages = useMemo(() => {
    const list: GalleryImage[] = [];
    
    // 1. Product main image
    const pMain = product?.images?.main || product?.thumbnail_url;
    if (pMain) {
      list.push({ url: pMain });
    }
    
    // 2. Variant images
    if (product?.variants) {
      for (const v of product.variants) {
        const vImg = v.images?.find((i) => i.is_main)?.url ?? v.images?.[0]?.url;
        if (vImg && !list.some((item) => item.url === vImg)) {
          list.push({ url: vImg, variantId: v.id, attributes: v.attributes });
        }
      }
    }
    
    // 3. Attr images
    if (product?.attr_images) {
      for (const ai of product.attr_images) {
        if (ai.url && !list.some((item) => item.url === ai.url)) {
          const matchingVariant = product.variants?.find((v) => v.attributes[ai.attr_key] === ai.attr_value);
          list.push({ 
            url: ai.url, 
            variantId: matchingVariant?.id, 
            attributes: matchingVariant?.attributes 
          });
        }
      }
    }
    
    return list;
  }, [product]);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const isScrollingRef = useRef(false);
  const scrollUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelectedVariantId = useRef<string | undefined>(undefined);

  const syncSelectedAttrsFromImage = useCallback((image?: GalleryImage) => {
    if (!image?.attributes) return;
    if (image.variantId) {
      prevSelectedVariantId.current = image.variantId;
    }
    setSelectedAttrs(image.attributes);
  }, []);

  const releaseProgrammaticScrollLock = useCallback(() => {
    if (scrollUnlockTimerRef.current) {
      clearTimeout(scrollUnlockTimerRef.current);
    }
    scrollUnlockTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      scrollUnlockTimerRef.current = null;
    }, 700);
  }, []);

  const scrollToImage = useCallback((index: number, shouldSyncVariant = true) => {
    const el = imageContainerRef.current;
    if (!el || index < 0 || index >= allImages.length) return;

    const width = el.clientWidth;
    if (width === 0) return;

    isScrollingRef.current = true;
    el.scrollTo({ left: index * width, behavior: 'smooth' });
    setCurrentImgIndex(index);
    if (shouldSyncVariant) {
      syncSelectedAttrsFromImage(allImages[index]);
    }
    releaseProgrammaticScrollLock();
  }, [allImages, releaseProgrammaticScrollLock, syncSelectedAttrsFromImage]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    const el = e.currentTarget;
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    if (width === 0) return;
    const index = Math.round(scrollLeft / width);
    if (index !== currentImgIndex && index >= 0 && index < allImages.length) {
      setCurrentImgIndex(index);
      if (scrollSyncTimerRef.current) {
        clearTimeout(scrollSyncTimerRef.current);
      }
      scrollSyncTimerRef.current = setTimeout(() => {
        syncSelectedAttrsFromImage(allImages[index]);
        scrollSyncTimerRef.current = null;
      }, 120);
    }
  }, [allImages, currentImgIndex, syncSelectedAttrsFromImage]);

  useEffect(() => {
    prevSelectedVariantId.current = undefined;
  }, [params.slug]);

  useEffect(() => {
    if (!selectedVariant) return;
    if (prevSelectedVariantId.current === undefined) {
      prevSelectedVariantId.current = selectedVariant.id;
      return;
    }
    if (selectedVariant.id === prevSelectedVariantId.current) return;
    prevSelectedVariantId.current = selectedVariant.id;

    const idx = allImages.findIndex((img) => img.variantId === selectedVariant.id);
    if (idx !== -1) {
      const frame = window.requestAnimationFrame(() => scrollToImage(idx, false));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [selectedVariant, allImages, scrollToImage]);

  useEffect(() => {
    return () => {
      if (scrollUnlockTimerRef.current) {
        clearTimeout(scrollUnlockTimerRef.current);
      }
      if (scrollSyncTimerRef.current) {
        clearTimeout(scrollSyncTimerRef.current);
      }
    };
  }, []);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] = useState<'add' | 'buy'>('add');

  const handleOpenDrawer = (action: 'add' | 'buy') => {
    setDrawerAction(action);
    setIsDrawerOpen(true);
  };



  const similarSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product || shouldLoadSimilar) return;
    const el = similarSectionRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setShouldLoadSimilar(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadSimilar(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product, shouldLoadSimilar]);

  const { data: similarData, isFetching: isFetchingSimilar } = useQuery({
    queryKey: ['similar', params.slug],
    queryFn: () => api.get(`/products/${params.slug}/similar`).then(r => r.data),
    enabled: !!product && shouldLoadSimilar,
    staleTime: 10 * 60 * 1000,
  });
  const similarItems: Product[] = similarData?.items ?? [];

  const { data: favoriteData, refetch: refetchFavorite } = useQuery({
    queryKey: ['wishlist-check', product?.id],
    queryFn: async () => {
      const res = await api.get(`/wishlist/check/${product!.id}`);
      return res.data as { is_favorite: boolean };
    },
    enabled: !!user && !!product?.id,
  });
  const isFavorite = favoriteData?.is_favorite ?? false;

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await api.delete(`/wishlist/${product!.id}`);
      } else {
        await api.post('/wishlist/', { product_id: product!.id });
      }
    },
    onSuccess: () => {
      refetchFavorite();
      toast.success(isFavorite ? "Đã xoá khỏi danh sách yêu thích!" : "Đã thêm vào danh sách yêu thích!");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail || "Lỗi khi xử lý danh sách yêu thích");
    }
  });

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: number) => carouselRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return <div className="py-[100px] text-center" style={{ color: 'var(--danger)' }}>Không tìm thấy sản phẩm</div>;

  const cleanedDescription = product?.description
    ? product.description.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/, "")
    : "";

  const handleProductAdviceChat = () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để Catbot AI tư vấn sản phẩm");
      return;
    }
    if (typeof window === 'undefined') return;

    const variantLabel = selectedVariant
      ? Object.entries(selectedVariant.attributes).map(([key, value]) => `${key}: ${value}`).join(", ")
      : "";
    const message = [
      `Mình đang xem sản phẩm "${product.name}".`,
      variantLabel ? `Phân loại đang chọn: ${variantLabel}.` : "",
      "Hãy tư vấn giúp sản phẩm này phù hợp với thú cưng nào, điểm nổi bật, lưu ý khi dùng và có nên mua không.",
    ].filter(Boolean).join(" ");

    window.dispatchEvent(new CustomEvent('open-catbot-chat', { detail: { message } }));
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-28 md:pb-8">
      {/* Breadcrumb */}
      <div className="hidden md:flex flex-wrap items-center gap-2 text-[13px] text-neutral-500 mb-6 md:mb-8">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link href="/shop" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Cửa hàng</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 lg:gap-16 items-start">
        {/* Gallery */}
        <div className="relative lg:sticky lg:top-24 lg:self-start">
          <div className="group/gallery bg-white border border-neutral-100 rounded-[20px] shadow-sm aspect-square overflow-hidden relative">
            <div 
              ref={imageContainerRef}
              onScroll={handleScroll}
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {allImages.length > 0 ? (
                allImages.map((img, idx) => (
                  <div key={idx} className="w-full h-full shrink-0 snap-start snap-always relative">
                    <Image src={img.url} alt={product.name} fill sizes="(max-width: 768px) 100vw, 50vw" loading="eager" className="object-cover" />
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">KHÔNG CÓ HÌNH ẢNH</div>
              )}
            </div>
            
            {/* Pagination / Slide indicator */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/55 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-[10px] select-none pointer-events-none z-10">
                {currentImgIndex + 1}/{allImages.length}
              </div>
            )}

            {/* Left/Right controls (hidden on mobile, shown on desktop hover) */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const idx = (currentImgIndex - 1 + allImages.length) % allImages.length;
                    scrollToImage(idx);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-neutral-800 flex items-center justify-center border border-neutral-200 cursor-pointer shadow-sm md:opacity-0 md:group-hover/gallery:opacity-100 transition-opacity duration-200 z-10"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idx = (currentImgIndex + 1) % allImages.length;
                    scrollToImage(idx);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-neutral-800 flex items-center justify-center border border-neutral-200 cursor-pointer shadow-sm md:opacity-0 md:group-hover/gallery:opacity-100 transition-opacity duration-200 z-10"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail selector */}
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToImage(idx)}
                  className={`relative w-14 h-14 rounded-[8px] overflow-hidden border-2 shrink-0 transition-all ${
                    idx === currentImgIndex ? 'border-[var(--primary-500)] shadow-sm scale-95' : 'border-neutral-100 hover:border-neutral-300'
                  }`}
                >
                  <Image src={img.url} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="flex flex-col gap-3">
          {/* Price Box - placed close to title, more compact */}
          <div className="py-3 px-4 rounded-[12px] border border-red-200/80 flex items-center justify-between gap-3 bg-[linear-gradient(135deg,rgba(239,68,68,0.07)_0%,rgba(249,115,22,0.07)_100%)] shadow-sm">
            <div className="flex flex-col justify-center">
              {effectivePrice < originalPrice && (
                <span className="text-xs md:text-sm text-neutral-500 line-through font-semibold">
                  {originalPrice.toLocaleString()}đ
                </span>
              )}
              <span className="text-2xl md:text-3xl font-extrabold text-[var(--danger)] leading-none mt-1">
                {effectivePrice.toLocaleString()}đ
              </span>
            </div>
            
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {/* Real Favorite Button */}
              <button 
                type="button" 
                onClick={() => {
                  if (!user) {
                    toast.error("Vui lòng đăng nhập để lưu sản phẩm yêu thích");
                    return;
                  }
                  toggleFavoriteMutation.mutate();
                }}
                disabled={toggleFavoriteMutation.isPending}
                className={`w-9 h-9 rounded-full border border-neutral-100 flex items-center justify-center transition-colors cursor-pointer bg-white ${
                  isFavorite ? 'text-red-500 border-red-100' : 'text-neutral-400 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              
              {/* Rating & Sold count */}
              <div className="flex items-center gap-2">
                {/* Rating */}
                <div className="flex items-center gap-0.5">
                  <span className="text-[12px] font-bold text-neutral-800">
                    {(product.avg_rating ?? 0).toFixed(1)}
                  </span>
                  <div className="relative inline-block w-3.5 h-3.5 select-none shrink-0">
                    {/* Background empty star */}
                    <svg className="w-full h-full text-neutral-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    {/* Foreground filled star */}
                    <div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: `${((product.avg_rating ?? 0) / 5) * 100}%` }}>
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="w-px h-3 bg-neutral-200" />
                
                {/* Sold Count */}
                <span className="text-[12px] text-neutral-500 font-medium">
                  Đã bán {product.sold_count ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Title and Ratings */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[12px] font-bold uppercase px-2.5 py-1 rounded-[6px]" style={{ color: 'var(--primary-600)', background: 'var(--primary-50)' }}>
                {product.brand || "LOCAL BRAND"}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] leading-[1.2] text-neutral-900">{product.name}</h1>
          </div>

          {/* CTA Buttons */}
          <div className="fixed bottom-0 inset-x-0 h-[56px] bg-white z-50 border-t border-neutral-100 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] md:relative md:bottom-auto md:p-0 md:bg-transparent md:z-auto md:border-none md:shadow-none md:mt-2 md:h-auto">
            {effectiveStock === 0 ? (
              <div className="w-full h-full md:py-3 flex items-center justify-center text-[15px] font-bold bg-neutral-100 text-neutral-400 md:rounded-[12px]">
                Hết hàng
              </div>
            ) : (
              <div className="flex items-stretch h-full md:h-auto md:flex md:items-center md:gap-3">
                {/* 1. Mobile Chat Button */}
                <button
                  type="button"
                  onClick={handleProductAdviceChat}
                  className="flex md:hidden flex-col items-center justify-center w-[64px] h-full text-neutral-500 hover:text-neutral-900 border-none bg-white cursor-pointer active:bg-neutral-50 border-r border-neutral-100 shrink-0"
                >
                  <MessageSquare size={18} />
                  <span className="text-[9px] mt-0.5 font-medium leading-none">Chat ngay</span>
                </button>

                {/* 2. Mobile Add to Cart Button (Shopee Style) */}
                <button
                  type="button"
                  onClick={() => handleOpenDrawer('add')}
                  className="flex md:hidden flex-col items-center justify-center w-[76px] h-full text-[var(--primary-600)] bg-[var(--primary-50)]/40 hover:text-[var(--primary-700)] border-none cursor-pointer active:bg-[var(--primary-50)] border-r border-neutral-100 shrink-0"
                >
                  <ShoppingCart size={18} />
                  <span className="text-[9px] mt-0.5 font-medium leading-none">Thêm vào giỏ</span>
                </button>

                {/* 3. Mobile Buy Now Button (Shopee Style: Solid Primary, Spans remaining width) */}
                <button
                  type="button"
                  onClick={() => handleOpenDrawer('buy')}
                  className="flex md:hidden flex-1 h-full font-bold text-[15px] text-white items-center justify-center border-none cursor-pointer"
                  style={{ background: 'var(--primary-600)' }}
                >
                  Mua ngay
                </button>

                {/* 4. Desktop Add to Cart Button */}
                <button
                  type="button"
                  onClick={() => handleOpenDrawer('add')}
                  className="hidden md:flex items-center justify-center px-6 h-[50px] rounded-[12px] text-[15px] font-semibold text-white border-none cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'var(--primary-600)' }}
                >
                  <ShoppingCart size={18} className="mr-2" />
                  <span>Thêm vào giỏ hàng</span>
                </button>

                {/* 5. Desktop Buy Now Button */}
                <button
                  type="button"
                  onClick={() => handleOpenDrawer('buy')}
                  className="hidden md:flex flex-1 h-[50px] rounded-[12px] text-[15px] font-bold border border-neutral-200 bg-white text-neutral-700 items-center justify-center gap-2 cursor-pointer hover:bg-neutral-50 active:scale-[0.98] transition-all"
                >
                  Mua ngay
                </button>
              </div>
            )}
          </div>

          {/* Shopee-style Variant & Quantity Drawer / Modal */}
          <ProductVariantDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            product={product}
            defaultAction={drawerAction}
            selectedAttrs={selectedAttrs}
            onSelectedAttrsChange={setSelectedAttrs}
          />

          {/* Minimalist Shipping and Trust info */}
          <div className="flex flex-col gap-2.5 text-[12px] text-neutral-500 px-1">
            <div className="flex items-center gap-2">
              <Truck size={15} className="text-[var(--primary-600)]" />
              <span>Freeship từ 300k • Nhận hàng 2-3 ngày</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-[var(--primary-600)]" />
              <span>Chính hãng 100% • Đổi trả miễn phí 15 ngày</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 mt-8 border-b border-neutral-200">
            {[
              { id: 'desc', label: 'Mô tả' },
              { id: 'review', label: 'Đánh giá', count: product.review_count || undefined },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full min-w-0 px-2 py-4 text-[15px] font-semibold bg-none border-none cursor-pointer transition-all duration-200 -mb-px flex items-center justify-center gap-1 whitespace-nowrap"
                style={{
                  color: activeTab === tab.id ? 'var(--neutral-900)' : 'var(--neutral-500)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
                }}
              >
                <span>{tab.label}</span>
                {tab.count && <span className="text-[13px] text-neutral-400 font-normal">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="py-7 text-[15px] leading-[1.8] text-neutral-900 font-medium w-full break-words [word-break:break-word] overflow-hidden">
            {activeTab === 'desc' && (
              cleanedDescription ? (
                <div className="whitespace-pre-line break-words">
                  {cleanedDescription}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-[16px] font-medium text-neutral-900">{product.name}</p>
                  <p>Sản phẩm chất lượng cao dành cho thú cưng của bạn. Đã được kiểm định an toàn và khuyên dùng bởi các chuyên gia y tế.</p>
                  <ul className="pl-5 flex flex-col gap-2">
                    <li><b>Dinh dưỡng tối ưu</b> — hỗ trợ phát triển toàn diện</li>
                    <li><b>Thành phần tự nhiên</b> — an toàn tuyệt đối cho sức khỏe</li>
                    <li><b>Hương vị hấp dẫn</b> — kích thích vị giác của thú cưng</li>
                  </ul>
                </div>
              )
            )}
            {activeTab === 'review' && <ReviewSection productId={product.id} />}
          </div>
        </div>
      </div>

      <div ref={similarSectionRef} className="h-px" aria-hidden="true" />

      {/* Similar Products */}
      {shouldLoadSimilar && isFetchingSimilar && similarItems.length === 0 && (
        <div className="mt-12">
          <div className="h-7 w-48 rounded-lg bg-neutral-100 animate-pulse mb-5" />
          <div className="flex gap-4 overflow-hidden pb-2 pt-1 px-1">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="w-[150px] md:w-[180px] shrink-0 bg-white border border-neutral-100 rounded-[16px] overflow-hidden"
              >
                <div className="aspect-square bg-neutral-100 animate-pulse" />
                <div className="p-[10px_12px_12px] flex flex-col gap-2">
                  <div className="h-3 w-16 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-4 w-full rounded bg-neutral-100 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-5 w-20 rounded bg-neutral-100 animate-pulse mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {similarItems.length > 0 && (
        <div className="mt-12">
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] mb-5 text-neutral-900">Sản phẩm tương tự</h2>
          <div className="relative">
            <button
              onClick={() => scrollCarousel(-1)}
              className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-[2] w-9 h-9 rounded-full bg-white border border-neutral-200 items-center justify-center text-neutral-700 cursor-pointer"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto pb-2 pt-1 px-1"
              style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
            >
              {similarItems.map((p: Product) => {
                const isOutOfStock = p.stock_qty !== undefined && p.stock_qty !== null && p.stock_qty <= 0;
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="w-[150px] md:w-[180px] shrink-0 no-underline text-inherit"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="group bg-white border border-neutral-100 rounded-[16px] shadow-xs cursor-pointer overflow-hidden flex flex-col h-full transition-[transform,box-shadow] duration-160 hover:-translate-y-0.5 hover:shadow-md">
                      <div className="relative aspect-square bg-neutral-50 overflow-hidden">
                        {p.thumbnail_url || p.images?.main ? (
                          <Image
                            src={p.thumbnail_url || p.images?.main || ''}
                            alt={p.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className={`object-cover ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px]">NO IMAGE</div>
                        )}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                            <span className="bg-neutral-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-[4px] tracking-wide uppercase">
                              Hết hàng
                            </span>
                          </div>
                        )}
                        {p.sale_price && (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: 'var(--danger)' }}>
                            -{Math.round((1 - p.sale_price / p.price) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="p-[10px_12px_12px] flex flex-col gap-1 flex-1">
                        <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-[0.04em]">{p.brand || "LOCAL BRAND"}</div>
                        <div className="text-[13px] font-semibold text-neutral-800 leading-[1.35] line-clamp-2 min-h-[35px]">{p.name}</div>
                        {p.avg_rating != null && (p.review_count ?? 0) > 0 && (
                          <div className="inline-flex items-center gap-1">
                            <StarRating value={Math.round(p.avg_rating)} size={11} />
                            <span className="text-[10px] text-neutral-500">({p.review_count})</span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
                          <span className="text-[15px] font-bold" style={{ color: 'var(--primary-600)' }}>{(p.sale_price || p.price).toLocaleString()}đ</span>
                          {p.sale_price && <span className="text-[11px] text-neutral-400 line-through">{p.price.toLocaleString()}đ</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <button
              onClick={() => scrollCarousel(1)}
              className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-[2] w-9 h-9 rounded-full bg-white border border-neutral-200 items-center justify-center text-neutral-700 cursor-pointer"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
