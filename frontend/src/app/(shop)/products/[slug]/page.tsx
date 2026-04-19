"use client";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { Minus, Plus, ShoppingCart, ChevronRight, Star, Sparkles, ShieldCheck, RefreshCw, Truck } from 'lucide-react';

const Rating = ({ value, count }: { value: number, count?: number }) => (
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
  const router = useRouter();
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

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await api.post('/cart/items', {
        product_id: product.id,
        quantity: quantity
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      alert("Đã thêm vào giỏ hàng thành công!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Lỗi khi thêm vào giỏ hàng");
    }
  });

  const handleAddToCart = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    addToCartMutation.mutate();
  };

  if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải...</div>;
  if (!product) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--danger)' }}>Không tìm thấy sản phẩm</div>;

  const price = product.sale_price || product.price;

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
            {product.images?.main ? (
              <img src={product.images.main} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)' }}>KHÔNG CÓ HÌNH ẢNH</div>
            )}
            <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {product.sale_price && <span className="badge badge-sale" style={{ fontSize: 13, padding: '5px 12px' }}>GIẢM {Math.round((1 - product.sale_price/product.price)*100)}%</span>}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-600)', background: 'var(--primary-50)', padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>{product.brand || "LOCAL BRAND"}</span>
              <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>SKU: {product.sku || "PS-001"}</span>
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
            display: 'flex', alignItems: 'baseline', gap: 12
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-600)' }}>{price.toLocaleString()}đ</span>
            {product.sale_price && <span style={{ fontSize: 18, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{product.price.toLocaleString()}đ</span>}
          </div>


          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { l: 'Phân loại', v: product.category_name || 'Chưa phân loại' },
              { l: 'Dành cho', v: product.target_species?.label || (product.target_species?.species?.join(', ') ?? 'Tất cả') },
              { l: 'Khối lượng', v: product.attributes?.weight || 'N/A' },
              { l: 'Xuất xứ', v: product.attributes?.origin || 'N/A' },
            ].map((a, i) => (
              <div key={i} style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--neutral-100)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>{a.l}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-800)' }}>{a.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16, borderTop: '1px solid var(--neutral-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', background: 'white', borderRadius: 14, border: '1.5px solid var(--neutral-200)',
                padding: '4px 6px', height: 52
              }}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--neutral-600)' }}
                >
                  <Minus size={18} />
                </button>
                <span style={{ width: 44, textAlign: 'center', fontSize: 18, fontWeight: 700 }}>{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock_qty || 99, quantity + 1))}
                  style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--neutral-600)' }}
                >
                  <Plus size={18} />
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={product.stock_qty === 0 || addToCartMutation.isPending}
                className="btn btn-primary btn-lg"
                style={{ flex: 1, height: 52, borderRadius: 14, fontSize: 16 }}
              >
                <ShoppingCart size={20} /> {addToCartMutation.isPending ? "Đang xử lý..." : "Thêm vào giỏ hàng"}
              </button>
            </div>
            <button className="btn btn-outline btn-lg" style={{ height: 52, borderRadius: 14, fontSize: 16, fontWeight: 700 }}>Mua ngay</button>
          </div>

          {/* AI Banner */}
          {/* <div style={{
            marginTop: 16, padding: '20px 24px', borderRadius: 20,
            background: 'linear-gradient(135deg, var(--teal-50) 0%, white 100%)',
            border: '1px solid var(--teal-100)', display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px var(--teal-100)' }}>
              <Sparkles size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal-700)' }}>Hỏi AI về sản phẩm này?</div>
              <div style={{ fontSize: 12, color: 'var(--teal-600)' }}>"Bé poodle 3kg nhà mình ăn hạt này được không?"</div>
            </div>
            <button className="btn btn-teal btn-sm" style={{ borderRadius: 10 }}>Hỏi ngay</button>
          </div> */}

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
              padding: '16px 24px', 
              fontSize: 15, 
              fontWeight: 600,
              color: activeTab === tab.id ? 'var(--neutral-900)' : 'var(--neutral-500)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-500)' : '2px solid transparent',
              marginBottom: -1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label} {tab.count && <span style={{ color: 'var(--neutral-400)', fontWeight: 500, fontSize: 13 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 0', fontSize: 15, lineHeight: 1.8, color: 'var(--neutral-700)', maxWidth: 800 }}>
        {activeTab === 'desc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--neutral-900)' }}>
              {product.name}
            </p>
            <p>
              {product.description || "Sản phẩm chất lượng cao dành cho thú cưng của bạn. Đã được kiểm định an toàn và khuyên dùng bởi các chuyên gia y tế. Chúng tôi cam kết mang đến những sản phẩm tốt nhất, giúp bé cưng của bạn phát triển khỏe mạnh và hạnh phúc."}
            </p>
            {/* Example content from prototype if description is short/missing */}
            {!product.description && (
              <>
                <p>Nổi bật với:</p>
                <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li><b>Dinh dưỡng tối ưu</b> — hỗ trợ phát triển toàn diện</li>
                  <li><b>Thành phần tự nhiên</b> — an toàn tuyệt đối cho sức khỏe</li>
                  <li><b>Hương vị hấp dẫn</b> — kích thích vị giác của thú cưng</li>
                  <li><b>Công nghệ hiện đại</b> — bảo quản dưỡng chất trọn vẹn</li>
                </ul>
              </>
            )}
          </div>
        )}
        {activeTab === 'spec' && (
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', rowGap: 16 }}>
            <span style={{ color: 'var(--neutral-500)' }}>Thương hiệu:</span>
            <span style={{ fontWeight: 600 }}>{product.brand || "Local Brand"}</span>
            <span style={{ color: 'var(--neutral-500)' }}>Loại sản phẩm:</span>
            <span style={{ fontWeight: 600 }}>{product.category_name}</span>
            <span style={{ color: 'var(--neutral-500)' }}>Trọng lượng:</span>
            <span style={{ fontWeight: 600 }}>{product.attributes?.weight || "N/A"}</span>
            <span style={{ color: 'var(--neutral-500)' }}>Xuất xứ:</span>
            <span style={{ fontWeight: 600 }}>{product.attributes?.origin || "Việt Nam"}</span>
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
