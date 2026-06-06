"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import api from '@/lib/api';
import { addToGuestCart } from '@/lib/guestCart';
import Link from 'next/link';
import { useAuthStore, useViewingProductStore } from '@/lib/store';
import { Minus, Plus, ShoppingCart, ChevronLeft, ChevronRight, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import ReviewSection from '@/components/reviews/ReviewSection';
import StarRating from '@/components/reviews/StarRating';
import Image from 'next/image';
import { Product, Variant, AttrImage } from '@/lib/types';
import { ProductDetailSkeleton } from "@/components/skeletons/ProductDetailSkeleton";
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('desc');

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

  const mainImage = useMemo(() => {
    const variantImage = selectedVariant?.images?.find((i) => i.is_main)?.url ?? selectedVariant?.images?.[0]?.url;
    if (variantImage) return variantImage;
    const attrImages: AttrImage[] = product?.attr_images ?? [];
    if (attrImages.length > 0 && selectedVariant) {
      for (const [key, val] of Object.entries(selectedVariant.attributes)) {
        const match = attrImages.find((i) => i.attr_key === key && i.attr_value === val);
        if (match) return match.url;
      }
    }
    return product?.images?.main ?? null;
  }, [selectedVariant, product]);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await api.post('/cart/items', {
        product_id: product!.id,
        variant_id: selectedVariant?.id ?? null,
        quantity,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }); toast.success("Đã thêm vào giỏ hàng!"); },
    onError: (err: { response?: { data?: { detail?: string } } }) => toast.error(err.response?.data?.detail || "Lỗi khi thêm vào giỏ hàng"),
  });

  const ensureVariantSelected = () => {
    if (hasVariants && !selectedVariant) {
      toast.error("Vui lòng chọn phân loại sản phẩm");
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!ensureVariantSelected()) return;
    if (!user) {
      addToGuestCart(product!.id, product!.slug, quantity, selectedVariant?.id ?? null);
      toast.success("Đã thêm vào giỏ hàng!");
      return;
    }
    addToCartMutation.mutate();
  };

  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const handleBuyNow = async () => {
    if (!ensureVariantSelected()) return;
    if (!user) {
      addToGuestCart(product!.id, product!.slug, quantity, selectedVariant?.id ?? null);
      router.push('/checkout');
      return;
    }
    setBuyNowLoading(true);
    try {
      const res = await api.post('/cart/items', {
        product_id: product!.id,
        variant_id: selectedVariant?.id ?? null,
        quantity,
      });
      const cartItem = res.data?.items?.find((i: { product_id: string; variant_id?: string | null }) =>
        i.product_id === product!.id && (i.variant_id ?? null) === (selectedVariant?.id ?? null)
      );
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.push(cartItem?.id ? `/checkout?items=${cartItem.id}` : '/checkout');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Lỗi khi xử lý. Vui lòng thử lại.");
    } finally { setBuyNowLoading(false); }
  };

  const { data: similarData } = useQuery({
    queryKey: ['similar', params.slug],
    queryFn: () => api.get(`/products/${params.slug}/similar`).then(r => r.data),
    enabled: !!product,
  });

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: number) => carouselRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return <div className="py-[100px] text-center" style={{ color: 'var(--danger)' }}>Không tìm thấy sản phẩm</div>;

  const discountPct = selectedVariant
    ? (selectedVariant.sale_price ? Math.round((1 - selectedVariant.sale_price / selectedVariant.price) * 100) : 0)
    : (product.sale_price ? Math.round((1 - product.sale_price / product.price) * 100) : 0);

  const infoItemCls = "px-4 py-3 rounded-[12px] border border-neutral-100 flex flex-col gap-0.5";

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-28 md:pb-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-neutral-500 mb-6 md:mb-8">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link href="/shop" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Cửa hàng</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
        {/* Gallery */}
        <div className="relative md:sticky md:top-24">
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm aspect-square overflow-hidden relative">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill sizes="(max-width: 768px) 100vw, 50vw" loading="eager" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">KHÔNG CÓ HÌNH ẢNH</div>
            )}
            {discountPct > 0 && (
              <div className="absolute top-5 left-5">
                <span className="px-3 py-1.5 rounded-[6px] text-[13px] font-bold text-white" style={{ background: 'var(--danger)' }}>
                  GIẢM {discountPct}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[12px] font-bold uppercase px-2.5 py-1 rounded-[6px]" style={{ color: 'var(--primary-600)', background: 'var(--primary-50)' }}>
                {product.brand || "LOCAL BRAND"}
              </span>
              {(selectedVariant?.sku || product.sku) && (
                <span className="text-[12px] text-neutral-400">SKU: {selectedVariant?.sku ?? product.sku}</span>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em] leading-[1.1] text-neutral-900 mb-4">{product.name}</h1>
            <div className="flex items-center gap-5">
              <div className="inline-flex items-center gap-1.5" style={{ color: 'oklch(0.75 0.15 75)' }}>
                <StarRating value={Math.round(product.avg_rating ?? 0)} size={16} />
                {(product.review_count ?? 0) > 0 && (
                  <span className="text-[13px] font-medium text-neutral-500">{product.review_count} đánh giá</span>
                )}
              </div>
              {(product.sold_count ?? 0) > 0 && (
                <>
                  <div className="w-px h-4 bg-neutral-200" />
                  <span className="text-[13px] text-neutral-600">Đã bán {product.sold_count}</span>
                </>
              )}
            </div>
          </div>

          {/* Price box */}
          <div className="flex items-baseline gap-3 p-6 rounded-[20px] border border-neutral-100"
            style={{ background: 'linear-gradient(135deg, var(--neutral-50) 0%, white 100%)' }}>
            <span className="text-2xl md:text-[32px] font-extrabold" style={{ color: 'var(--primary-600)' }}>{effectivePrice.toLocaleString()}đ</span>
            {effectivePrice < originalPrice && (
              <span className="text-base md:text-lg text-neutral-400 line-through">{originalPrice.toLocaleString()}đ</span>
            )}
          </div>

          {/* Variant Selector */}
          {hasVariants && Object.entries(attrOptions).map(([attrKey, values]) => (
            <div key={attrKey}>
              <div className="text-[13px] font-semibold text-neutral-600 mb-2 capitalize">
                {attrKey}:
                {effectiveSelectedAttrs[attrKey] && <span className="text-neutral-900 ml-1.5">{effectiveSelectedAttrs[attrKey]}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {values.map((val) => {
                  const active = effectiveSelectedAttrs[attrKey] === val;
                  const matchingVariant = variants.find((v) => {
                    const testAttrs = { ...effectiveSelectedAttrs, [attrKey]: val };
                    return Object.entries(testAttrs).every(([k, tv]) => !tv || v.attributes[k] === tv);
                  });
                  const available = matchingVariant ? matchingVariant.stock_qty > 0 : false;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelectedAttrs((prev) => ({ ...(Object.keys(prev).length > 0 ? prev : effectiveSelectedAttrs), [attrKey]: val }))}
                      className="px-4 py-2 min-h-[44px] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-all"
                      style={{
                        border: active ? '2px solid var(--primary-500)' : '1.5px solid var(--neutral-200)',
                        background: active ? 'var(--primary-50)' : 'white',
                        color: active ? 'var(--primary-700)' : available ? 'var(--neutral-700)' : 'var(--neutral-400)',
                        opacity: available ? 1 : 0.5,
                      }}
                    >
                      {val}{!available && <span className="text-[10px] text-neutral-400 ml-1">(hết)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick info */}
          {!hasVariants && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { l: 'Phân loại', v: product.category_name || 'Chưa phân loại' },
                { l: 'Dành cho', v: product.target_species?.label || (product.target_species?.species?.join(', ') ?? 'Tất cả') },
              ].map((a, i) => (
                <div key={i} className={infoItemCls}>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase">{a.l}</span>
                  <span className="text-[14px] font-semibold text-neutral-800">{a.v}</span>
                </div>
              ))}
            </div>
          )}

          {selectedVariant && Object.keys(selectedVariant.attributes).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(selectedVariant.attributes).map(([k, v]) => (
                <div key={k} className={infoItemCls}>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase">{k}</span>
                  <span className="text-[14px] font-semibold text-neutral-800">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="fixed bottom-0 inset-x-0 p-5 bg-white z-50 rounded-t-[24px] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] md:relative md:bottom-auto md:p-0 md:bg-transparent md:z-auto flex flex-col gap-3 md:gap-4 md:mt-4 md:pt-4 md:border-t md:border-neutral-100 md:rounded-none md:shadow-none">
            {effectiveStock === 0 && (
              <div className="text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>Hết hàng</div>
            )}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Quantity */}
              <div className="flex items-center bg-white border-[1.5px] border-neutral-200 rounded-[14px] px-1 h-[52px]">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 rounded-[10px] border-none bg-transparent cursor-pointer text-neutral-600 flex items-center justify-center hover:bg-neutral-50 transition-colors">
                  <Minus size={18} />
                </button>
                <span className="w-10 text-center text-[18px] font-bold text-neutral-900">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(effectiveStock || 99, quantity + 1))}
                  className="w-11 h-11 rounded-[10px] border-none bg-transparent cursor-pointer text-neutral-600 flex items-center justify-center hover:bg-neutral-50 transition-colors">
                  <Plus size={18} />
                </button>
              </div>
              {/* Add to cart */}
              <button
                onClick={handleAddToCart}
                disabled={effectiveStock === 0 || addToCartMutation.isPending || (hasVariants && !selectedVariant)}
                className="flex-1 h-[52px] rounded-[14px] text-[16px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 border-none cursor-pointer"
                style={{ background: 'var(--primary-600)' }}
              >
                <ShoppingCart size={20} />
                {addToCartMutation.isPending ? <><Spinner size={20} /> Đang thêm...</> : "Thêm vào giỏ hàng"}
              </button>
            </div>
            {/* Buy now */}
            <button
              onClick={handleBuyNow}
              disabled={effectiveStock === 0 || buyNowLoading || (hasVariants && !selectedVariant)}
              className="w-full h-[52px] rounded-[14px] text-[16px] font-bold border-[1.5px] border-neutral-200 bg-white text-neutral-700 flex items-center justify-center gap-2 cursor-pointer hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buyNowLoading ? <><Spinner size={18} /> Đang xử lý...</> : "Mua ngay"}
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3 md:gap-4 mt-2">
            {[
              { i: <ShieldCheck size={18} />, t: 'Chính hãng 100%' },
              { i: <RefreshCw size={18} />, t: 'Đổi trả 15 ngày' },
              { i: <Truck size={18} />, t: 'Giao hàng hỏa tốc' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-neutral-500 font-medium">
                <span style={{ color: 'var(--primary-500)' }}>{f.i}</span> {f.t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 md:gap-8 mt-12 md:mt-16 border-b border-neutral-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'desc', label: 'Mô tả' },
          { id: 'review', label: 'Đánh giá', count: product.review_count || undefined },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-6 py-4 text-[15px] font-semibold bg-none border-none cursor-pointer transition-all duration-200 -mb-px shrink-0"
            style={{
              color: activeTab === tab.id ? 'var(--neutral-900)' : 'var(--neutral-500)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
            }}
          >
            {tab.label} {tab.count && <span className="text-[13px] text-neutral-400 font-normal">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-8 text-[15px] leading-[1.8] text-neutral-700 max-w-[800px]">
        {activeTab === 'desc' && (
          product.description ? (
            <div className="prose prose-neutral max-w-none">
              <ReactMarkdown>{product.description}</ReactMarkdown>
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

      {/* Similar Products */}
      {similarData?.items?.length > 0 && (
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
              {similarData.items.map((p: Product) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="w-[150px] md:w-[180px] shrink-0 no-underline text-inherit"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="group bg-white border border-neutral-100 rounded-[16px] shadow-xs cursor-pointer overflow-hidden flex flex-col h-full transition-[transform,box-shadow] duration-160 hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative aspect-square bg-neutral-50">
                      {p.thumbnail_url || p.images?.main ? (
                        <Image src={p.thumbnail_url || p.images?.main || ''} alt={p.name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px]">NO IMAGE</div>
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
              ))}
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
