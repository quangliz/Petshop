"use client";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { addToGuestCart } from '@/lib/guestCart';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { ChevronRight, Star, ShoppingCart, Filter as FilterIcon, Check } from 'lucide-react';

const FilterGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div style={{ padding: '16px 0', borderBottom: '1px solid var(--neutral-100)' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-800)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
);

const Checkbox = ({ label, count, checked, onChange, icon }: { label: React.ReactNode, count?: number, checked: boolean, onChange: () => void, icon?: React.ReactNode }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 13, color: 'var(--neutral-700)' }}>
    <span style={{
      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
      background: checked ? 'var(--primary-500)' : 'white',
      border: checked ? 'none' : '1.5px solid var(--neutral-300)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
    }}>
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
    {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
    <span style={{ flex: 1 }}>{label}</span>
    {count != null && <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontFamily: 'var(--font-mono)' }}>{count}</span>}
    <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
  </label>
);

const FilterSidebar = ({
  categories, brands,
  categoryFilter, setCategoryFilter,
  brandFilter, setBrandFilter,
  priceRangeFilter, setPriceRangeFilter,
  setPage
}: {
  categories: { id: number, name: string, slug: string }[];
  brands: string[];
  categoryFilter: string[];
  setCategoryFilter: (c: string[]) => void;
  brandFilter: string[];
  setBrandFilter: (b: string[]) => void;
  priceRangeFilter: [number | '', number | ''];
  setPriceRangeFilter: (r: [number | '', number | '']) => void;
  setPage: (p: number) => void;
}) => {
  // Use local state for price range while dragging, apply on button click
  const [localPriceRange, setLocalPriceRange] = useState<[number | '', number | '']>(priceRangeFilter);

  const toggleCategory = (val: string) => {
    setCategoryFilter(categoryFilter.includes(val) ? categoryFilter.filter(s => s !== val) : [...categoryFilter, val]);
    setPage(1);
  };

  const toggleBrand = (val: string) => {
    setBrandFilter(brandFilter.includes(val) ? brandFilter.filter(s => s !== val) : [...brandFilter, val]);
    setPage(1);
  };

  const handleApplyPrice = () => {
    setPriceRangeFilter(localPriceRange);
    setPage(1);
  };

  return (
    <aside style={{ width: 260, flexShrink: 0 }}>
      <div className="card" style={{ padding: '4px 20px 20px', position: 'sticky', top: 84 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilterIcon size={14} /> Bộ lọc
          </div>
          <button
            onClick={() => {
              setCategoryFilter([]);
              setBrandFilter([]);
              setPriceRangeFilter(['', '']);
              setLocalPriceRange(['', '']);
              setPage(1);
            }}
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-600)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Xoá tất cả
          </button>
        </div>

        <FilterGroup title="Danh mục">
          {categories?.map(c => (
            <Checkbox key={c.id} label={c.name}
              checked={categoryFilter.includes(c.slug)} onChange={() => toggleCategory(c.slug)} />
          ))}
        </FilterGroup>

        <FilterGroup title="Thương hiệu">
          {brands?.map(b => (
            <Checkbox key={b} label={b}
              checked={brandFilter.includes(b)} onChange={() => toggleBrand(b)} />
          ))}
        </FilterGroup>

        <FilterGroup title="Khoảng giá">
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <input type="number" min="0" step="1000" placeholder="Từ (₫)"
              value={localPriceRange[0] === '' ? '' : localPriceRange[0]}
              onChange={e => setLocalPriceRange([e.target.value === '' ? '' : Math.max(0, Number(e.target.value)), localPriceRange[1]])}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--neutral-200)', borderRadius: '6px', fontSize: 13, outline: 'none' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--neutral-500)' }}>-</span>
            <input type="number" min={localPriceRange[0] === '' ? 0 : localPriceRange[0]} step="1000" placeholder="Đến (₫)"
              value={localPriceRange[1] === '' ? '' : localPriceRange[1]}
              onChange={e => setLocalPriceRange([localPriceRange[0], e.target.value === '' ? '' : Math.max(0, Number(e.target.value))])}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--neutral-200)', borderRadius: '6px', fontSize: 13, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleApplyPrice}>Áp dụng</button>
          </div>
        </FilterGroup>
      </div>
    </aside>
  );
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

const ProductCard = ({ product, onAddToCart, isPending }: { product: any, onAddToCart: any, isPending: boolean }) => (
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
          <div style={{ width: '100%', height: '100%', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)', fontSize: 10 }}>NO IMAGE</div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {product.sale_price && (
            <span className="badge badge-sale">-{Math.round((1 - product.sale_price / product.price) * 100)}%</span>
          )}
          {product.is_new && <span className="badge badge-new">MỚI</span>}
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.brand || "LOCAL BRAND"}</div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--neutral-800)', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: 38
        }}>{product.name}</div>
        <Rating value={4.5} count={product.reviews_count || 0} size={11} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary-600)' }}>{(product.sale_price || product.price).toLocaleString()}đ</span>
          {product.sale_price && <span style={{ fontSize: 12, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{product.price.toLocaleString()}đ</span>}
        </div>
        <button 
          onClick={(e) => onAddToCart(e, product.id)}
          disabled={isPending}
          className="btn btn-outline btn-sm"
          style={{ width: '100%', marginTop: 12, borderRadius: 10 }}
        >
          <ShoppingCart size={14} /> Thêm giỏ
        </button>
      </div>
    </div>
  </Link>
);

export default function ShopListing() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [search] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [priceRangeFilter, setPriceRangeFilter] = useState<[number | '', number | '']>(['', '']);

  const size = 12;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories/');
      return res.data;
    }
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get('/products/brands');
      return res.data;
    }
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, size, sort, search, categoryFilter, brandFilter, priceRangeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), size: String(size), sort });
      if (search) params.set('q', search);
      categoryFilter.forEach(s => params.append('category_slug', s));
      brandFilter.forEach(b => params.append('brand', b));
      if (priceRangeFilter[0] !== '') params.set('min_price', String(priceRangeFilter[0]));
      if (priceRangeFilter[1] !== '') params.set('max_price', String(priceRangeFilter[1]));
      const res = await api.get(`/products/?${params.toString()}`);
      return res.data;
    }
  });

  const addToCartMutation = useMutation({
    mutationFn: async (product_id: string) => {
      await api.post('/cart/items', { product_id, quantity: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      alert("Đã thêm vào giỏ hàng!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Lỗi khi thêm giỏ hàng");
    }
  });

  const handleAddToCart = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    if (!user) {
      addToGuestCart(productId);
      alert("Đã thêm vào giỏ hàng tạm thời. Đăng nhập để thanh toán.");
      return;
    }
    addToCartMutation.mutate(productId);
  };

  if (isLoading) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải sản phẩm...</div>;
  if (error) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--danger)' }}>Có lỗi khi tải sản phẩm</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--neutral-500)', marginBottom: 24 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Trang chủ</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>Cửa hàng</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Tất cả sản phẩm</h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginTop: 4 }}>Hiển thị {data.items.length} trong số {data.total} sản phẩm</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select 
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); }}
            style={{ 
              padding: '8px 16px', borderRadius: 10, border: '1px solid var(--neutral-100)', 
              background: 'white', fontSize: 13, fontWeight: 600, color: 'var(--neutral-700)',
              outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá thấp đến cao</option>
            <option value="price_desc">Giá cao đến thấp</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
        <FilterSidebar 
          categories={categories || []}
          brands={brands || []}
          categoryFilter={categoryFilter} 
          setCategoryFilter={setCategoryFilter} 
          brandFilter={brandFilter}
          setBrandFilter={setBrandFilter}
          priceRangeFilter={priceRangeFilter}
          setPriceRangeFilter={setPriceRangeFilter}
          setPage={setPage} 
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {data.items.map((prod: any) => (
              <ProductCard 
                key={prod.id} 
                product={prod} 
                onAddToCart={handleAddToCart} 
                isPending={addToCartMutation.isPending} 
              />
            ))}
          </div>

          {data.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 56 }}>
              <button 
                className="btn btn-outline" 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '10px 20px' }}
              >
                Trang trước
              </button>
              {[...Array(data.pages)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setPage(i + 1)}
                  style={{
                    width: 40, height: 40, borderRadius: 10, border: '1px solid var(--neutral-100)',
                    background: page === i + 1 ? 'var(--neutral-900)' : 'white',
                    color: page === i + 1 ? 'white' : 'var(--neutral-700)',
                    fontWeight: 600, cursor: 'pointer', transition: 'all 120ms ease'
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                className="btn btn-outline" 
                disabled={page >= data.pages} 
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '10px 20px' }}
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
