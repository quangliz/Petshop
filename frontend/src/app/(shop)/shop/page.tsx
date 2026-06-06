"use client";
import React, { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { addToGuestCart } from '@/lib/guestCart';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Star, ShoppingCart, Filter as FilterIcon, Check, SearchX } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import Image from 'next/image';
import { Product, Category } from '@/lib/types';
import { ShopPageSkeleton } from "@/components/skeletons/ProductCardSkeleton";
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

type CategoryFacet = Category & { parent_id?: number | null; product_count: number };
type BrandFacet = { name: string; product_count: number };
type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const getPaginationItems = (currentPage: number, totalPages: number): PaginationItem[] => {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const sortedPages = Array.from(pages)
    .filter(page => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sortedPages.flatMap((pageNumber, index) => {
    const previous = sortedPages[index - 1];
    if (previous && pageNumber - previous > 1) {
      return [pageNumber < currentPage ? "ellipsis-start" : "ellipsis-end", pageNumber] as PaginationItem[];
    }
    return [pageNumber];
  });
};

const FilterGroup = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="py-4 border-b border-neutral-100">
    <div className="text-[12px] font-bold text-neutral-800 uppercase tracking-[0.06em] mb-3">{title}</div>
    {children}
  </div>
);

const Checkbox = ({ label, count, checked, onChange, icon }: { label: React.ReactNode, count?: number, checked: boolean, onChange: () => void, icon?: React.ReactNode }) => (
  <label className="flex items-center gap-2.5 py-1.5 cursor-pointer text-[13px] text-neutral-700">
    <span className={`w-[18px] h-[18px] rounded-[5px] shrink-0 flex items-center justify-center text-white ${checked ? 'border-none' : 'border-[1.5px] border-neutral-300 bg-white'}`}
      style={{ background: checked ? 'var(--primary-500)' : undefined }}>
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
    {icon && <span className="text-[15px]">{icon}</span>}
    <span className="flex-1">{label}</span>
    {count != null && <span className="text-[11px] text-neutral-400 font-mono">{count}</span>}
    <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
  </label>
);

const FilterSidebar = ({
  categories, brands,
  categoryFilter, setCategoryFilter,
  brandFilter, setBrandFilter,
  priceRangeFilter, setPriceRangeFilter,
  setPage, className = "bg-white border border-neutral-100 rounded-[20px] shadow-sm"
}: {
  categories: CategoryFacet[];
  brands: BrandFacet[];
  categoryFilter: string[];
  setCategoryFilter: (c: string[]) => void;
  brandFilter: string[];
  setBrandFilter: (b: string[]) => void;
  priceRangeFilter: [number | '', number | ''];
  setPriceRangeFilter: (r: [number | '', number | '']) => void;
  setPage: (p: number) => void;
  className?: string;
}) => {
  const [localPriceRange, setLocalPriceRange] = useState<[number | '', number | '']>(priceRangeFilter);

  const toggleCategory = (val: string) => {
    setCategoryFilter(categoryFilter.includes(val) ? categoryFilter.filter(s => s !== val) : [...categoryFilter, val]);
    setPage(1);
  };
  const toggleBrand = (val: string) => {
    setBrandFilter(brandFilter.includes(val) ? brandFilter.filter(s => s !== val) : [...brandFilter, val]);
    setPage(1);
  };
  const handleApplyPrice = () => { setPriceRangeFilter(localPriceRange); setPage(1); };

  return (
    <div className={`${className} p-1 px-5 pb-5`}>
      <div className="flex items-center justify-between pt-[18px]">
        <div className="text-[14px] font-bold flex items-center gap-2"><FilterIcon size={14} /> Bộ lọc</div>
        <button
          onClick={() => { setCategoryFilter([]); setBrandFilter([]); setPriceRangeFilter(['', '']); setLocalPriceRange(['', '']); setPage(1); }}
          className="text-[11px] font-semibold bg-none border-none cursor-pointer"
          style={{ color: 'var(--primary-600)' }}
        >
          Xoá tất cả
        </button>
      </div>

      <FilterGroup title="Danh mục">
        {categories?.map(c => (
          <Checkbox key={c.id} label={c.name}
            count={c.product_count}
            checked={categoryFilter.includes(c.slug)} onChange={() => toggleCategory(c.slug)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Thương hiệu">
        {brands?.map(b => (
          <Checkbox key={b.name} label={b.name}
            count={b.product_count}
            checked={brandFilter.includes(b.name)} onChange={() => toggleBrand(b.name)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Khoảng giá">
        <div className="flex gap-2.5 mt-2.5">
          <input type="number" min="0" step="1000" placeholder="Từ (₫)"
            value={localPriceRange[0] === '' ? '' : localPriceRange[0]}
            onChange={e => setLocalPriceRange([e.target.value === '' ? '' : Math.max(0, Number(e.target.value)), localPriceRange[1]])}
            className="w-full p-2 border border-neutral-200 rounded-[6px] text-[13px] outline-none"
          />
          <span className="flex items-center text-neutral-500">-</span>
          <input type="number" min={localPriceRange[0] === '' ? 0 : localPriceRange[0]} step="1000" placeholder="Đến (₫)"
            value={localPriceRange[1] === '' ? '' : localPriceRange[1]}
            onChange={e => setLocalPriceRange([localPriceRange[0], e.target.value === '' ? '' : Math.max(0, Number(e.target.value))])}
            className="w-full p-2 border border-neutral-200 rounded-[6px] text-[13px] outline-none"
          />
        </div>
        <div className="flex gap-2 mt-3.5">
          <button
            className="flex-1 h-9 rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary-600)' }}
            onClick={handleApplyPrice}
          >Áp dụng</button>
        </div>
      </FilterGroup>
    </div>
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

const ProductCard = ({ product, onAddToCart, isPending }: { product: Product, onAddToCart: (e: React.MouseEvent, id: string, slug: string, hasVariants: boolean) => void, isPending: boolean }) => (
  <Link href={`/products/${product.slug}`} className="no-underline text-inherit">
    <div
      className="group bg-white border border-neutral-100 rounded-[16px] shadow-xs cursor-pointer overflow-hidden flex flex-col h-full transition-[transform,box-shadow] duration-160 ease-ease hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square bg-neutral-50 overflow-hidden">
        {(product.thumbnail_url || product.images?.main) ? (
          <Image
            src={product.thumbnail_url || product.images?.main || ''}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-[10px]">NO IMAGE</div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.sale_price && (
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold text-white" style={{ background: 'var(--danger)' }}>
              -{Math.round((1 - product.sale_price / product.price) * 100)}%
            </span>
          )}
          {product.is_new && <span className="px-1.5 py-0.5 rounded text-[11px] font-bold text-white" style={{ background: 'var(--teal-600)' }}>MỚI</span>}
        </div>
      </div>
      <div className="p-[14px_16px_16px] flex flex-col gap-1.5 flex-1">
        <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-[0.04em]">{product.brand || "LOCAL BRAND"}</div>
        <div className="text-[14px] font-semibold text-neutral-800 leading-[1.35] line-clamp-2 min-h-[38px]">{product.name}</div>
        <Rating value={4.5} count={product.review_count || 0} size={11} />
        <div className="flex items-baseline gap-2 mt-auto pt-1.5">
          <span className="text-[17px] font-bold" style={{ color: 'var(--primary-600)' }}>{(product.sale_price || product.price).toLocaleString()}đ</span>
          {product.sale_price && <span className="text-[12px] text-neutral-400 line-through">{product.price.toLocaleString()}đ</span>}
        </div>
        <button
          onClick={(e) => onAddToCart(e, product.id, product.slug, !!product.has_variants)}
          disabled={isPending}
          className="w-full mt-3 h-9 rounded-[10px] text-[13px] font-semibold border-[1.5px] border-neutral-200 bg-white text-neutral-700 flex items-center justify-center gap-1.5 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {isPending ? <Spinner size={14} /> : <ShoppingCart size={14} />} {isPending ? "Đang thêm..." : product.has_variants ? "Chọn phân loại" : "Thêm giỏ"}
        </button>
      </div>
    </div>
  </Link>
);

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopPageSkeleton />}>
      <ShopListing />
    </Suspense>
  );
}

function ShopListing() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') || '';
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [priceRangeFilter, setPriceRangeFilter] = useState<[number | '', number | '']>(['', '']);
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) { setPrevSearch(search); if (page !== 1) setPage(1); }

  const size = 12;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: facets } = useQuery({
    queryKey: ['product-facets'],
    queryFn: async () => (await api.get('/products/facets')).data as { categories: CategoryFacet[]; brands: BrandFacet[] }
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

  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const addToCartMutation = useMutation({
    mutationFn: async (product_id: string) => { await api.post('/cart/items', { product_id, quantity: 1 }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }); toast.success("Đã thêm vào giỏ hàng!"); setPendingProductId(null); },
    onError: (err: { response?: { data?: { detail?: string } } }) => { toast.error(err.response?.data?.detail || "Lỗi khi thêm giỏ hàng"); setPendingProductId(null); }
  });

  const handleAddToCart = (e: React.MouseEvent, productId: string, slug: string, hasVariants: boolean) => {
    e.preventDefault();
    if (hasVariants) {
      router.push(`/products/${slug}`);
      return;
    }
    if (!user) { addToGuestCart(productId, slug); toast.success("Đã thêm vào giỏ hàng!"); return; }
    setPendingProductId(productId);
    addToCartMutation.mutate(productId);
  };

  if (isLoading) return <ShopPageSkeleton />;
  if (error) return <div className="p-[100px] text-center" style={{ color: 'var(--danger)' }}>Có lỗi khi tải sản phẩm</div>;

  const paginationItems = getPaginationItems(page, data.pages);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-8 overflow-x-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Cửa hàng</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-[28px] md:text-[32px] font-extrabold tracking-[-0.025em] m-0">
            {search ? `Kết quả cho "${search}"` : 'Tất cả sản phẩm'}
          </h1>
          <p className="text-[14px] text-neutral-500 mt-1">Hiển thị {data.items.length} trong số {data.total} sản phẩm</p>
        </div>
        <div className="flex gap-3 items-center justify-end">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger render={
                <button className="h-9 px-4 rounded-[10px] border-[1.5px] border-neutral-200 bg-white text-neutral-700 flex items-center justify-center gap-2 text-[13px] font-semibold">
                  <FilterIcon size={16} /> Lọc
                </button>
              } />
              <SheetContent side="right" className="p-0 overflow-y-auto w-[300px] max-w-[calc(100vw-24px)]">
                <SheetTitle className="sr-only">Bộ lọc</SheetTitle>
                <FilterSidebar className="pb-4"
                  categories={facets?.categories || []} brands={facets?.brands || []}
                  categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
                  brandFilter={brandFilter} setBrandFilter={setBrandFilter}
                  priceRangeFilter={priceRangeFilter} setPriceRangeFilter={setPriceRangeFilter}
                  setPage={setPage}
                />
              </SheetContent>
            </Sheet>
          </div>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1); }}
            className="h-[38px] px-4 rounded-[10px] border border-neutral-100 bg-white text-[13px] font-semibold text-neutral-700 outline-none cursor-pointer"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá thấp đến cao</option>
            <option value="price_desc">Giá cao đến thấp</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8 items-start">
        <aside className="hidden lg:block w-[260px] shrink-0 sticky top-[84px] max-h-[calc(100vh-104px)] overflow-y-auto">
          <FilterSidebar
            categories={facets?.categories || []} brands={facets?.brands || []}
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            brandFilter={brandFilter} setBrandFilter={setBrandFilter}
            priceRangeFilter={priceRangeFilter} setPriceRangeFilter={setPriceRangeFilter}
            setPage={setPage}
          />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {data.items.map((prod: Product) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onAddToCart={handleAddToCart}
                isPending={pendingProductId === prod.id && addToCartMutation.isPending}
              />
            ))}
            {data.items.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  icon={<SearchX size={32} />}
                  title="Không tìm thấy sản phẩm"
                  description={search ? `Không có kết quả cho "${search}". Hãy thử từ khóa khác.` : "Không có sản phẩm nào phù hợp với bộ lọc đã chọn."}
                  actionLabel="Xem tất cả sản phẩm"
                  actionHref="/shop"
                />
              </div>
            )}
          </div>

          {data.pages > 1 && (
            <div className="flex flex-nowrap justify-center gap-1 sm:gap-2 mt-14 max-w-full overflow-hidden">
              <button
                className="h-9 w-8 sm:h-11 sm:w-auto sm:px-5 rounded-[10px] border border-neutral-100 bg-white text-neutral-700 text-[12px] sm:text-[13px] font-semibold disabled:opacity-40 cursor-pointer hover:bg-neutral-50 transition-colors inline-flex items-center justify-center gap-1 shrink-0"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                aria-label="Trang trước"
              >
                <ChevronLeft size={15} />
                <span className="hidden sm:inline">Trang trước</span>
              </button>
              {paginationItems.map(item => (
                typeof item === "number" ? (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`min-w-8 min-h-9 sm:min-w-[44px] sm:min-h-[44px] rounded-[10px] border border-neutral-100 text-[12px] sm:text-[13px] font-semibold cursor-pointer transition-all duration-120 ease-ease shrink-0 ${
                      page === item ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {item}
                  </button>
                ) : (
                  <span
                    key={item}
                    className="min-w-3 sm:min-w-[32px] h-9 sm:h-11 flex items-center justify-center text-[12px] sm:text-[13px] font-semibold text-neutral-400 shrink-0"
                  >
                    ...
                  </span>
                )
              ))}
              <button
                className="h-9 w-8 sm:h-11 sm:w-auto sm:px-5 rounded-[10px] border border-neutral-100 bg-white text-neutral-700 text-[12px] sm:text-[13px] font-semibold disabled:opacity-40 cursor-pointer hover:bg-neutral-50 transition-colors inline-flex items-center justify-center gap-1 shrink-0"
                disabled={page >= data.pages}
                onClick={() => setPage(p => p + 1)}
                aria-label="Trang sau"
              >
                <span className="hidden sm:inline">Trang sau</span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
