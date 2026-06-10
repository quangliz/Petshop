"use client";
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { addToGuestCart } from '@/lib/guestCart';
import { Product, Variant } from '@/lib/types';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import Image from 'next/image';

interface ProductVariantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  defaultAction?: 'add' | 'buy';
  selectedAttrs?: Record<string, string>;
  onSelectedAttrsChange?: (attrs: Record<string, string>) => void;
}

export default function ProductVariantDrawer({
  isOpen,
  onClose,
  product,
  defaultAction = 'add',
  selectedAttrs,
  onSelectedAttrsChange
}: ProductVariantDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [quantity, setQuantity] = useState(1);
  const [buyNowLoading, setBuyNowLoading] = useState(false);

  const variants: Variant[] = useMemo(() => product.variants ?? [], [product]);
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

  const [localSelectedAttrs, setLocalSelectedAttrs] = useState<Record<string, string>>({});

  const currentSelectedAttrs = selectedAttrs !== undefined ? selectedAttrs : localSelectedAttrs;
  const handleSelectedAttrsChange = onSelectedAttrsChange !== undefined ? onSelectedAttrsChange : setLocalSelectedAttrs;

  const defaultVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => v.stock_qty > 0) ?? variants[0] ?? null;
  }, [hasVariants, variants]);

  const effectiveSelectedAttrs = useMemo(() => {
    if (!hasVariants) return {};
    return Object.keys(currentSelectedAttrs).length > 0 ? currentSelectedAttrs : (defaultVariant?.attributes ?? {});
  }, [defaultVariant, hasVariants, currentSelectedAttrs]);

  const selectedVariant: Variant | null = useMemo(() => {
    if (!hasVariants) return null;
    const keys = Object.keys(attrOptions);
    if (keys.length === 0) return variants[0] ?? null;
    if (!keys.every((k) => effectiveSelectedAttrs[k])) return null;
    return variants.find((v) => keys.every((k) => v.attributes[k] === effectiveSelectedAttrs[k])) ?? null;
  }, [variants, effectiveSelectedAttrs, attrOptions, hasVariants]);

  const effectivePrice = selectedVariant
    ? (selectedVariant.sale_price ?? selectedVariant.price)
    : (product.sale_price ?? product.price ?? 0);
  const originalPrice = selectedVariant ? selectedVariant.price : product.price ?? 0;
  const effectiveStock = selectedVariant ? selectedVariant.stock_qty : (product.stock_qty ?? 0);
  const totalPrice = effectivePrice * quantity;
  const totalOriginalPrice = originalPrice * quantity;

  const mainImage = useMemo(() => {
    const variantImage = selectedVariant?.images?.find((i) => i.is_main)?.url ?? selectedVariant?.images?.[0]?.url;
    if (variantImage) return variantImage;
    return product.thumbnail_url || product.images?.main || null;
  }, [selectedVariant, product]);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      await api.post('/cart/items', {
        product_id: product.id,
        variant_id: selectedVariant?.id ?? null,
        quantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success("Đã thêm vào giỏ hàng!");
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) =>
      toast.error(err.response?.data?.detail || "Lỗi khi thêm vào giỏ hàng"),
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
      addToGuestCart(product.id, product.slug, quantity, selectedVariant?.id ?? null);
      toast.success("Đã thêm vào giỏ hàng!");
      onClose();
      return;
    }
    addToCartMutation.mutate();
  };

  const handleBuyNow = async () => {
    if (!ensureVariantSelected()) return;
    if (!user) {
      addToGuestCart(product.id, product.slug, quantity, selectedVariant?.id ?? null);
      onClose();
      router.push('/checkout');
      return;
    }
    setBuyNowLoading(true);
    try {
      const res = await api.post('/cart/items', {
        product_id: product.id,
        variant_id: selectedVariant?.id ?? null,
        quantity,
      });
      const cartItem = res.data?.items?.find((i: { product_id: string; variant_id?: string | null }) =>
        i.product_id === product.id && (i.variant_id ?? null) === (selectedVariant?.id ?? null)
      );
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      onClose();
      router.push(cartItem?.id ? `/checkout?items=${cartItem.id}` : '/checkout');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Lỗi khi xử lý. Vui lòng thử lại.");
    } finally {
      setBuyNowLoading(false);
    }
  };

  const handleConfirmAction = () => {
    if (defaultAction === 'add') {
      handleAddToCart();
    } else {
      handleBuyNow();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Content */}
      <div
        className="relative w-full max-w-[500px] bg-white rounded-t-[20px] md:rounded-[20px] shadow-2xl overflow-hidden z-10 animate-slide-up flex flex-col max-h-[85vh] md:max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex gap-4 items-start relative">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-100 shrink-0 bg-neutral-50 flex items-center justify-center">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill className="object-cover" />
            ) : (
              <span className="text-[10px] text-neutral-400 font-bold uppercase">NO IMG</span>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="text-[15px] font-bold text-neutral-900 leading-snug line-clamp-2">{product.name}</h3>
            <div className="flex flex-wrap items-baseline gap-1.5 mt-1">
              {totalPrice < totalOriginalPrice && (
                <span className="text-[12px] text-neutral-400 line-through font-semibold">
                  {totalOriginalPrice.toLocaleString()}đ
                </span>
              )}
              <span className="text-[18px] font-extrabold text-[var(--danger)]">
                {totalPrice.toLocaleString()}đ
              </span>
            </div>
            <div className="text-[12px] text-neutral-500 mt-0.5">
              Đơn giá: <span className="font-semibold text-neutral-800">{effectivePrice.toLocaleString()}đ</span> × {quantity}
            </div>
            <div className="text-[12px] text-neutral-500 mt-0.5">
              Kho: <span className="font-semibold text-neutral-800">{effectiveStock}</span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 border-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-5 flex-1">
          {/* Variant Selector */}
          {hasVariants && Object.entries(attrOptions).map(([attrKey, values]) => (
            <div key={attrKey}>
              <div className="text-[13px] font-semibold text-neutral-600 mb-2 capitalize">
                Chọn {attrKey}:
                {effectiveSelectedAttrs[attrKey] && <span className="text-neutral-900 ml-1.5 font-bold">{effectiveSelectedAttrs[attrKey]}</span>}
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
                      type="button"
                      onClick={() => {
                        const prev = Object.keys(currentSelectedAttrs).length > 0 ? currentSelectedAttrs : effectiveSelectedAttrs;
                        handleSelectedAttrsChange({ ...prev, [attrKey]: val });
                      }}
                      className="px-4 py-2 min-h-[40px] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-all"
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

          {/* Quantity Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-neutral-600">Số lượng:</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border border-neutral-200 rounded-[12px] px-1 h-[42px]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-[8px] border-none bg-transparent cursor-pointer text-neutral-600 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center text-[16px] font-bold text-neutral-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(effectiveStock || 99, quantity + 1))}
                  className="w-9 h-9 rounded-[8px] border-none bg-transparent cursor-pointer text-neutral-600 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-[13px] text-neutral-500">
                {effectiveStock > 0 ? `${effectiveStock} sản phẩm có sẵn` : 'Hết hàng'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Confirm Action */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
          <button
            type="button"
            onClick={handleConfirmAction}
            disabled={effectiveStock === 0 || buyNowLoading || addToCartMutation.isPending || (hasVariants && !selectedVariant)}
            className="w-full h-[48px] rounded-[12px] text-[15px] font-bold text-white flex items-center justify-center gap-2 cursor-pointer border-none transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--primary-600)' }}
          >
            {defaultAction === 'add' ? (
              addToCartMutation.isPending ? (
                <>
                  <Spinner size={14} className="text-white" />
                  <span className="truncate">Đang thêm...</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  <span className="truncate">{`Thêm vào giỏ • ${totalPrice.toLocaleString()}đ`}</span>
                </>
              )
            ) : (
              buyNowLoading ? (
                <>
                  <Spinner size={14} className="text-white" />
                  <span className="truncate">Đang xử lý...</span>
                </>
              ) : (
                <span className="truncate">{`Mua ngay • ${totalPrice.toLocaleString()}đ`}</span>
              )
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
