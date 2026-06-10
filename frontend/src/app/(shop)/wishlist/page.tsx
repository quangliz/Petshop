"use client";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

import { ChevronRight, ShoppingCart, Heart, HeartOff } from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

import ProductVariantDrawer from '@/components/ProductVariantDrawer';

const ProductCard = ({ 
  product, 
  onAddToCart, 
  onRemoveFavorite,
  isLoading
}: { 
  product: Product, 
  onAddToCart: (e: React.MouseEvent, product: Product) => void, 
  onRemoveFavorite: (e: React.MouseEvent, id: string) => void,
  isLoading: boolean
}) => {
  const isOutOfStock = product.stock_qty !== undefined && product.stock_qty !== null && product.stock_qty <= 0;
  return (
    <Link href={`/products/${product.slug}`} className="no-underline text-inherit relative group block">
      <div
        className="bg-white border border-neutral-100 rounded-[16px] shadow-xs cursor-pointer overflow-hidden flex flex-col h-full transition-[transform,box-shadow] duration-160 ease-ease hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="relative aspect-square bg-neutral-50 overflow-hidden">
          {(product.thumbnail_url || product.images?.main) ? (
            <Image
              src={product.thumbnail_url || product.images?.main || ''}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`object-cover transition-transform duration-300 ease-out group-hover:scale-105 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
            />
          ) : (
            <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-[10px]">NO IMAGE</div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="bg-neutral-900/80 text-white text-[12px] font-bold px-3 py-1 rounded-[6px] tracking-wide uppercase">
                Hết hàng
              </span>
            </div>
          )}
          
          {/* Heart Button to remove from favorites */}
          <button
            type="button"
            onClick={(e) => onRemoveFavorite(e, product.id)}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-red-500 hover:text-red-600 hover:scale-105 active:scale-95 transition-all z-20 border-none cursor-pointer"
          >
            <Heart size={16} fill="currentColor" />
          </button>

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
          
          {/* Rating */}
          {product.avg_rating != null && (
            <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
              ★ <span>{product.avg_rating.toFixed(1)}</span>
              <span className="text-neutral-400 font-normal">({product.review_count || 0})</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-1.5">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-[17px] font-bold" style={{ color: 'var(--primary-600)' }}>{(product.sale_price || product.price).toLocaleString()}đ</span>
              {product.sale_price && <span className="text-[12px] text-neutral-400 line-through">{product.price.toLocaleString()}đ</span>}
            </div>
            <button
              onClick={(e) => onAddToCart(e, product)}
              disabled={isLoading || isOutOfStock}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                isOutOfStock
                  ? 'bg-neutral-100 border-transparent text-neutral-400 cursor-not-allowed'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 active:scale-95 shadow-xs'
              }`}
              title={product.has_variants ? "Chọn phân loại" : "Thêm vào giỏ"}
            >
              {isLoading ? <Spinner size={12} /> : <ShoppingCart size={14} />}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function WishlistPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const queryClient = useQueryClient();
  const [productForDrawer, setProductForDrawer] = useState<Product | null>(null);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const removeFavoriteMutation = useMutation({
    mutationFn: async (product_id: string) => {
      await api.delete(`/wishlist/${product_id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success("Đã xoá khỏi danh sách yêu thích");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail || "Lỗi khi xoá yêu thích");
    }
  });

  const { data: wishlist, isLoading, error } = useQuery<Product[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await api.get('/wishlist/');
      return res.data;
    },
    enabled: !!user,
  });

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    if (loadingProductId) return;
    setLoadingProductId(product.id);
    try {
      const res = await api.get(`/products/${product.slug}`);
      setProductForDrawer(res.data);
    } catch {
      toast.error("Không thể tải thông tin sản phẩm");
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleRemoveFavorite = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFavoriteMutation.mutate(productId);
  };

  if (authLoading || isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 py-16 flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 py-16 text-center">
        <EmptyState
          icon={<HeartOff size={48} className="text-neutral-300" />}
          title="Bạn chưa đăng nhập"
          description="Vui lòng đăng nhập để xem danh sách sản phẩm yêu thích của bạn."
          actionLabel="Đăng nhập ngay"
          actionHref="/login"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 py-16 text-center text-red-500">
        Có lỗi xảy ra khi tải danh sách yêu thích. Vui lòng thử lại.
      </div>
    );
  }

  const items = wishlist || [];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900 transition-colors">Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Sản phẩm yêu thích</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-[28px] md:text-[32px] font-extrabold tracking-[-0.025em] m-0 flex items-center gap-3">
          Sản phẩm yêu thích <span className="text-red-500">💝</span>
        </h1>
        <p className="text-[14px] text-neutral-500 mt-1">
          Bạn đang lưu {items.length} sản phẩm trong danh sách yêu thích
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Heart size={48} className="text-neutral-300" />}
          title="Danh sách yêu thích trống"
          description="Hãy nhấn vào biểu tượng trái tim ở các trang chi tiết sản phẩm để lưu lại tại đây."
          actionLabel="Khám phá cửa hàng"
          actionHref="/shop"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onAddToCart={handleAddToCart}
              onRemoveFavorite={handleRemoveFavorite}
              isLoading={loadingProductId === prod.id}
            />
          ))}
        </div>
      )}
      {productForDrawer && (
        <ProductVariantDrawer
          isOpen={!!productForDrawer}
          onClose={() => setProductForDrawer(null)}
          product={productForDrawer}
        />
      )}
    </div>
  );
}
