"use client";
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import api from '@/lib/api';
import { addToGuestCart } from '@/lib/guestCart';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { Minus, Plus, ShoppingCart, ChevronRight, Star, ShieldCheck, RefreshCw, Truck } from 'lucide-react';

type Variant = {
  id: string; sku: string | null; price: number; sale_price: number | null;
  stock_qty: number; attributes: Record<string, string>; is_active: boolean;
};
type AttrImage = { attr_key: string; attr_value: string; url: string };
type ProductImage = { id: string; url: string; is_main: boolean; sort_order: number; variant_id: string | null };

const Rating = ({ value, count }: { value: number; count?: number }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'oklch(0.75 0.15 75)' }}>
    <div style={{ display: 'inline-flex' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <Star key={i} size={16} fill={i < Math.round(value) ? "currentColor" : "none"} />
      ))}
    </div>
    {count != null && <span style={{ color: 'var(--neutral-500)', fontSize: 13, fontWeight: 500 }}>{count} đánh giá</span>}
  </div>
);

export default function ProductDetailPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('desc');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', params.slug],
    queryFn: async () => {
      const res = await api.get(`/products/${params.slug}`);
      return res.data;
    }
  });

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
      await api.post('/cart/items', { product_id: product.id, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      alert("Đã thêm vào giỏ hàng thành công!");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => alert(err.response?.data?.detail || "Lỗi khi thêm vào giỏ hàng"),
  });

  const handleAddToCart = () => {
    if (!user) {
      addToGuestCart(product.id, quantity);
      alert("Đã thêm vào giỏ hàng tạm thời. Đăng nhập để thanh toán.");
      return;
    }
    addToCartMutation.mutate();
  };

  if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải...</div>;
  if (!product) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--danger)' }}>Không tìm thấy sản phẩm</div>;

  const discountPct = selectedVariant
    ? (selectedVariant.sale_price ? Math.round((1 - selectedVariant.sale_price / selectedVariant.price) * 100) : 0)
    : (product.sale_price ? Math.round((1 - product.sale_price / product.price) * 100) : 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--neutral-500)', marginBottom: 32 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <Link href="/shop" style={{ color: 'inherit', textDecoration: 'none' }}>Cửa hàng</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'start' }}>
        {/* Gallery */}
        <div style={{ position: 'sticky', top: 100 }}>
          <div className="card" style={{ aspectRatio: '1/1', overflow: 'hidden', background: 'var(--neutral-50)', position: 'relative' }}>
            {mainImage ? (
              <img src={mainImage} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--neutral-900)', margin: '0 0 16px' }}>{product.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Rating value={4.8} count={42} />
              <div style={{ width: 1, height: 16, background: 'var(--neutral-200)' }} />
              <span style={{ fontSize: 13, color: 'var(--neutral-600)', fontWeight: 500 }}>Đã bán 150+</span>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, var(--neutral-50) 0%, white 100%)',
            padding: '24px 28px', borderRadius: 20, border: '1px solid var(--neutral-100)',
            display: 'flex', alignItems: 'baseline', gap: 12,
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-600)' }}>{effectivePrice.toLocaleString()}đ</span>
            {effectivePrice < originalPrice && (
              <span style={{ fontSize: 18, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{originalPrice.toLocaleString()}đ</span>
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
                        padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {Object.entries(selectedVariant.attributes).map(([k, v]) => (
                <div key={k} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--neutral-100)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>{k}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-800)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16, borderTop: '1px solid var(--neutral-100)' }}>
            {effectiveStock === 0 && (
              <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Hết hàng</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                <ShoppingCart size={20} /> {addToCartMutation.isPending ? "Đang xử lý..." : "Thêm vào giỏ hàng"}
              </button>
            </div>
            <button className="btn btn-outline btn-lg" style={{ height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700 }}>Mua ngay</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
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
      <div style={{ marginTop: 64, borderBottom: '1px solid var(--neutral-200)', display: 'flex', gap: 8 }}>
        {[
          { id: 'desc', label: 'Mô tả' },
          { id: 'spec', label: 'Thông số' },
          { id: 'review', label: 'Đánh giá', count: 42 },
          { id: 'ship', label: 'Vận chuyển' },
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
        {activeTab === 'spec' && (
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', rowGap: 16 }}>
            <span style={{ color: 'var(--neutral-500)' }}>Thương hiệu:</span>
            <span style={{ fontWeight: 600 }}>{product.brand || "Local Brand"}</span>
            <span style={{ color: 'var(--neutral-500)' }}>Loại sản phẩm:</span>
            <span style={{ fontWeight: 600 }}>{product.category_name}</span>
            {hasVariants && selectedVariant && Object.entries(selectedVariant.attributes).map(([k, v]) => (
              <React.Fragment key={k}>
                <span style={{ color: 'var(--neutral-500)', textTransform: 'capitalize' }}>{k}:</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </React.Fragment>
            ))}
            {!hasVariants && <>
              <span style={{ color: 'var(--neutral-500)' }}>Trọng lượng:</span>
              <span style={{ fontWeight: 600 }}>{product.attributes?.weight || "N/A"}</span>
              <span style={{ color: 'var(--neutral-500)' }}>Xuất xứ:</span>
              <span style={{ fontWeight: 600 }}>{product.attributes?.origin || "Việt Nam"}</span>
            </>}
          </div>
        )}
        {activeTab === 'review' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--neutral-500)' }}>
            <Rating value={4.8} count={42} />
            <p style={{ marginTop: 12 }}>Xem tất cả đánh giá từ khách hàng đã mua sản phẩm.</p>
          </div>
        )}
        {activeTab === 'ship' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p>🚚 <b>Giao hàng hỏa tốc:</b> Nội thành TP.HCM và Hà Nội trong vòng 2-4h.</p>
            <p>📦 <b>Giao hàng tiêu chuẩn:</b> Toàn quốc từ 2-5 ngày làm việc.</p>
            <p>💰 <b>Phí vận chuyển:</b> Miễn phí cho đơn hàng từ 500.000đ.</p>
          </div>
        )}
      </div>
    </div>
  );
}
