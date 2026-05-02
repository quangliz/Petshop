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

// Types imported from @/lib/types

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
    queryFn: async () => {
      const res = await api.get(`/products/${params.slug}`);
      return res.data;
    }
  });

  useEffect(() => {
    if (product) {
      setViewingProduct({ id: product.id, slug: product.slug, name: product.name });
    }
    return () => setViewingProduct(null);
  }, [product, setViewingProduct]);

  const variants: Variant[] = useMemo(() => product?.variants ?? [], [product]);
  const hasVariants = variants.length > 0;

  // Build attribute options from variants: { attrKey -> Set<value> }
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

  // Selected attribute values per key
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});

  // Find matching variant from selected attrs
  const selectedVariant: Variant | null = useMemo(() => {
    if (!hasVariants) return null;
    const keys = Object.keys(attrOptions);
    if (keys.length === 0) return variants[0] ?? null;
    return variants.find((v) =>
      keys.every((k) => !selectedAttrs[k] || v.attributes[k] === selectedAttrs[k])
    ) ?? null;
  }, [variants, selectedAttrs, attrOptions, hasVariants]);

  // Effective price, stock, image
  const effectivePrice = selectedVariant
    ? (selectedVariant.sale_price ?? selectedVariant.price)
    : (product?.sale_price ?? product?.price ?? 0);
  const originalPrice = selectedVariant ? selectedVariant.price : product?.price ?? 0;
  const effectiveStock = selectedVariant ? selectedVariant.stock_qty : (product?.stock_qty ?? 0);

  // Image: find attr_image matching any selected attribute, else product main image
  const mainImage = useMemo(() => {
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
      await api.post('/cart/items', { product_id: product!.id, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success("Đã thêm vào giỏ hàng!");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => toast.error(err.response?.data?.detail || "Lỗi khi thêm vào giỏ hàng"),
  });

  const handleAddToCart = () => {
    if (!user) {
      addToGuestCart(product!.id, product!.slug, quantity);
      toast.success("Đã thêm vào giỏ hàng!");
      return;
    }
    addToCartMutation.mutate();
  };

  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const handleBuyNow = async () => {
    if (!user) {
      addToGuestCart(product!.id, product!.slug, quantity);
      router.push('/checkout');
      return;
    }
    setBuyNowLoading(true);
    try {
      const res = await api.post('/cart/items', { product_id: product!.id, quantity });
      const updatedCart = res.data;
      const cartItem = updatedCart?.items?.find(
        (i: { product_id: string }) => i.product_id === product!.id
      );
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.push(cartItem?.id ? `/checkout?items=${cartItem.id}` : '/checkout');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Lỗi khi xử lý. Vui lòng thử lại.");
    } finally {
      setBuyNowLoading(false);
    }
  };

  const { data: similarData } = useQuery({
    queryKey: ['similar', params.slug],
    queryFn: () => api.get(`/products/${params.slug}/similar`).then(r => r.data),
    enabled: !!product,
  });

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: number) => carouselRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--danger)' }}>Không tìm thấy sản phẩm</div>;

  const discountPct = selectedVariant
    ? (selectedVariant.sale_price ? Math.round((1 - selectedVariant.sale_price / selectedVariant.price) * 100) : 0)
    : (product.sale_price ? Math.round((1 - product.sale_price / product.price) * 100) : 0);

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
          <div className="card" style={{ aspectRatio: '1/1', overflow: 'hidden', background: 'var(--neutral-50)', position: 'relative' }}>
            {mainImage ? (
              <Image
                src={mainImage}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="eager"
                className="object-cover"
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)' }}>KHÔNG CÓ HÌNH ẢNH</div>
            )}
            {discountPct > 0 && (
              <div style={{ position: 'absolute', top: 20, left: 20 }}>
                <span className="badge badge-sale" style={{ fontSize: 13, padding: '5px 12px' }}>GIẢM {discountPct}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-600)', background: 'var(--primary-50)', padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>{product.brand || "LOCAL BRAND"}</span>
              {(selectedVariant?.sku || product.sku) && (
                <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>SKU: {selectedVariant?.sku ?? product.sku}</span>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl" style={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--neutral-900)', margin: '0 0 16px' }}>{product.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'oklch(0.75 0.15 75)' }}>
                <StarRating value={Math.round(product.avg_rating ?? 0)} size={16} />
                {(product.review_count ?? 0) > 0 && <span style={{ color: 'var(--neutral-500)', fontSize: 13, fontWeight: 500 }}>{product.review_count} đánh giá</span>}
              </div>
              {(product.sold_count ?? 0) > 0 && (
                <>
                  <div style={{ width: 1, height: 16, background: 'var(--neutral-200)' }} />
                  <span style={{ fontSize: 13, color: 'var(--neutral-600)', fontWeight: 500 }}>Đã bán {product.sold_count}</span>
                </>
              )}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, var(--neutral-50) 0%, white 100%)',
            padding: '24px 28px', borderRadius: 20, border: '1px solid var(--neutral-100)',
            display: 'flex', alignItems: 'baseline', gap: 12,
          }}>
            <span className="text-2xl md:text-[32px]" style={{ fontWeight: 800, color: 'var(--primary-600)' }}>{effectivePrice.toLocaleString()}đ</span>
            {effectivePrice < originalPrice && (
              <span className="text-base md:text-lg" style={{ color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{originalPrice.toLocaleString()}đ</span>
            )}
          </div>

          {/* Variant Selector */}
          {hasVariants && Object.entries(attrOptions).map(([attrKey, values]) => (
            <div key={attrKey}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 8, textTransform: 'capitalize' }}>
                {attrKey}:
                {selectedAttrs[attrKey] && (
                  <span style={{ color: 'var(--neutral-900)', marginLeft: 6 }}>{selectedAttrs[attrKey]}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {values.map((val) => {
                  const active = selectedAttrs[attrKey] === val;
                  const matchingVariant = variants.find((v) => {
                    const testAttrs = { ...selectedAttrs, [attrKey]: val };
                    return Object.entries(testAttrs).every(([k, tv]) => !tv || v.attributes[k] === tv);
                  });
                  const available = matchingVariant ? matchingVariant.stock_qty > 0 : true;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelectedAttrs((prev) => ({ ...prev, [attrKey]: active ? "" : val }))}
                      style={{
                        padding: '8px 16px', minHeight: 44, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: active ? '2px solid var(--primary-500)' : '1.5px solid var(--neutral-200)',
                        background: active ? 'var(--primary-50)' : 'white',
                        color: active ? 'var(--primary-700)' : available ? 'var(--neutral-700)' : 'var(--neutral-400)',
                        opacity: available ? 1 : 0.5,
                        position: 'relative',
                      }}
                    >
                      {val}
                      {!available && (
                        <span style={{ fontSize: 10, color: 'var(--neutral-400)', marginLeft: 4 }}>(hết)</span>
                      )}
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
                // { l: 'Khối lượng', v: product.attributes?.weight || 'N/A' },
                // { l: 'Xuất xứ', v: product.attributes?.origin || 'N/A' },
              ].map((a, i) => (
                <div key={i} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--neutral-100)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>{a.l}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-800)' }}>{a.v}</span>
                </div>
              ))}
            </div>
          )}

          {selectedVariant && Object.keys(selectedVariant.attributes).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(selectedVariant.attributes).map(([k, v]) => (
                <div key={k} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--neutral-100)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>{k}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-800)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="fixed bottom-[60px] inset-x-0 p-5 bg-white z-50 rounded-t-[24px] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] md:relative md:bottom-auto md:p-0 md:bg-transparent md:z-auto flex flex-col gap-3 md:gap-4 md:mt-4 md:pt-4 md:border-t md:border-neutral-100 md:rounded-none md:shadow-none">
            {effectiveStock === 0 && (
              <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Hết hàng</div>
            )}
            <div className="flex items-center gap-3 md:gap-4">
              <div style={{
                display: 'flex', alignItems: 'center', background: 'white', borderRadius: 14, border: '1.5px solid var(--neutral-200)',
                padding: '0 4px', height: 52,
              }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={18} />
                </button>
                <span style={{ width: 40, textAlign: 'center', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-900)' }}>{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(effectiveStock || 99, quantity + 1))}
                  style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={18} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={effectiveStock === 0 || addToCartMutation.isPending}
                className="btn btn-primary btn-lg"
                style={{ flex: 1, height: 52, borderRadius: 14, fontSize: 16 }}
              >
                <ShoppingCart size={20} /> {addToCartMutation.isPending ? <><Spinner size={20} /> Đang thêm...</> : "Thêm vào giỏ hàng"}
              </button>
            </div>
            <button
              onClick={handleBuyNow}
              disabled={effectiveStock === 0 || buyNowLoading}
              className="btn btn-outline btn-lg w-full md:w-auto"
              style={{ height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700 }}
            >
              {buyNowLoading ? <><Spinner size={18} /> Đang xử lý...</> : "Mua ngay"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 md:gap-4 mt-2">
            {[
              { i: <ShieldCheck size={18} />, t: 'Chính hãng 100%' },
              { i: <RefreshCw size={18} />, t: 'Đổi trả 15 ngày' },
              { i: <Truck size={18} />, t: 'Giao hàng hỏa tốc' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--neutral-500)', fontWeight: 500 }}>
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
            style={{
              padding: '16px 24px', fontSize: 15, fontWeight: 600,
              color: activeTab === tab.id ? 'var(--neutral-900)' : 'var(--neutral-500)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              marginBottom: -1, background: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            {tab.label} {tab.count && <span style={{ color: 'var(--neutral-400)', fontWeight: 500, fontSize: 13 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 0', fontSize: 15, lineHeight: 1.8, color: 'var(--neutral-700)', maxWidth: 800 }}>
        {activeTab === 'desc' && (
          product.description ? (
            <div className="prose prose-neutral max-w-none">
              <ReactMarkdown>{product.description}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--neutral-900)' }}>{product.name}</p>
              <p>Sản phẩm chất lượng cao dành cho thú cưng của bạn. Đã được kiểm định an toàn và khuyên dùng bởi các chuyên gia y tế.</p>
              <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li><b>Dinh dưỡng tối ưu</b> — hỗ trợ phát triển toàn diện</li>
                <li><b>Thành phần tự nhiên</b> — an toàn tuyệt đối cho sức khỏe</li>
                <li><b>Hương vị hấp dẫn</b> — kích thích vị giác của thú cưng</li>
              </ul>
            </div>
          )
        )}

        {activeTab === 'review' && (
          <ReviewSection productId={product.id} />
        )}
      </div>

      {/* Related Products Carousel */}
      {similarData?.items?.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20, color: 'var(--neutral-900)' }}>
            Sản phẩm tương tự
          </h2>
          <div style={{ position: 'relative' }}>
            <button onClick={() => scrollCarousel(-1)} style={{
              position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
              width: 36, height: 36, borderRadius: 18, background: 'white', border: '1px solid var(--neutral-200)',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--neutral-700)',
            }}>
              <ChevronLeft size={18} />
            </button>
            <div ref={carouselRef} style={{
              display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none', padding: '4px 4px 8px',
            }}>
              {similarData.items.map((p: Product) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="w-[150px] md:w-[180px] flex-shrink-0" style={{ textDecoration: 'none', color: 'inherit', scrollSnapAlign: 'start' }}>
                  <div className="card" style={{
                    cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%',
                    transition: 'transform 160ms ease, box-shadow 160ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--neutral-50)' }}>
                      {p.thumbnail_url || p.images?.main ? (
                        <Image 
                          src={p.thumbnail_url || p.images?.main || ''} 
                          alt={p.name} 
                          fill 
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', fontSize: 10 }}>NO IMAGE</div>
                      )}
                      {p.sale_price && (
                        <span className="badge badge-sale" style={{ position: 'absolute', top: 8, left: 8, fontSize: 10 }}>
                          -{Math.round((1 - p.sale_price / p.price) * 100)}%
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <div style={{ fontSize: 10, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.brand || "LOCAL BRAND"}</div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)', lineHeight: 1.35,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        minHeight: 35,
                      }}>{p.name}</div>
                      {p.avg_rating != null && (p.review_count ?? 0) > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <StarRating value={Math.round(p.avg_rating)} size={11} />
                          <span style={{ fontSize: 10, color: 'var(--neutral-500)' }}>({p.review_count})</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 'auto', paddingTop: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-600)' }}>{(p.sale_price || p.price).toLocaleString()}đ</span>
                        {p.sale_price && <span style={{ fontSize: 11, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{p.price.toLocaleString()}đ</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <button onClick={() => scrollCarousel(1)} style={{
              position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2,
              width: 36, height: 36, borderRadius: 18, background: 'white', border: '1px solid var(--neutral-200)',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--neutral-700)',
            }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
