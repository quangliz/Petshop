"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "@/lib/api";
import { toast } from "sonner";
import { Product } from "@/lib/types";

const PRODUCT_TAG_RE = /<product>\s*([^<>\s]+)\s*<\/product>/gi;
const PRODUCT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER_PRODUCT_SLUGS = new Set(["slug", "product-slug", "ten-san-pham", "slug-san-pham"]);

function isRenderableProductSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return PRODUCT_SLUG_RE.test(normalized) && !PLACEHOLDER_PRODUCT_SLUGS.has(normalized);
}

type ChatProduct = {
  slug: string;
  name: string;
  brand?: string | null;
  price: number;
  sale_price?: number | null;
  thumbnail_url?: string | null;
};

function ProductCard({ pr, onAddToCart }: { pr: ChatProduct; onAddToCart?: (e: React.MouseEvent) => void }) {
  const effectivePrice = pr.sale_price ?? pr.price;
  return (
    <a
      href={`/products/${pr.slug}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex gap-3 items-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 no-underline text-inherit align-top w-full md:max-w-md my-1.5 transition-all duration-200 hover:shadow-md hover:bg-neutral-50/80"
    >
      {pr.thumbnail_url ? (
        <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-lg bg-white border border-neutral-50">
          <Image src={pr.thumbnail_url} alt={pr.name} fill sizes="48px" className="object-cover m-0" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-neutral-100 shrink-0" />
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-between h-full min-h-[44px]">
        <div className="text-[12px] font-bold text-neutral-800 line-clamp-2 leading-tight m-0">{pr.name}</div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="text-[12px] font-extrabold text-teal-700 m-0">{effectivePrice.toLocaleString("vi-VN")}đ</div>
          {onAddToCart && (
            <button
              onClick={onAddToCart}
              className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
              style={{ color: "var(--primary-600)", background: "var(--primary-50)" }}
              title="Thêm vào giỏ hàng"
            >
              <ShoppingCart size={13} />
            </button>
          )}
        </div>
      </div>
    </a>
  );
}

function ProductCardWrapper({
  slug,
  onOpenDrawer,
}: {
  slug: string;
  onOpenDrawer?: (product: Product) => void;
}) {
  const [product, setProduct] = useState<ChatProduct | null>(null);
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      if (!isRenderableProductSlug(slug)) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/products/${slug}`);
        if (isMounted) {
          setProduct({
            slug: data.slug,
            name: data.name,
            brand: data.brand,
            price: data.price,
            sale_price: data.sale_price,
            thumbnail_url: data.images?.main || null,
          });
          setFullProduct(data);
        }
      } catch (err) {
        console.error("Failed to fetch product for forum card:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleAddToCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onOpenDrawer) return;

    if (fullProduct) {
      onOpenDrawer(fullProduct);
      return;
    }

    const toastId = toast.loading("Đang tải thông tin sản phẩm...");
    try {
      const { data } = await api.get(`/products/${slug}`);
      setFullProduct(data);
      onOpenDrawer(data);
      toast.dismiss(toastId);
    } catch (err) {
      console.error("Failed to fetch full product for drawer:", err);
      toast.error("Không thể lấy thông tin sản phẩm. Vui lòng thử lại.", { id: toastId });
    }
  };

  if (loading) {
    return (
      <div
        className="inline-flex gap-3 items-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 align-top animate-pulse w-full md:max-w-md my-1.5"
        style={{ height: "66px" }}
      >
        <div className="w-12 h-12 rounded-lg bg-neutral-200 shrink-0" />
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 justify-center">
          <div className="h-3 bg-neutral-200 rounded w-3/4" />
          <div className="h-3 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  return <ProductCard pr={product} onAddToCart={onOpenDrawer ? handleAddToCartClick : undefined} />;
}

export function ProductMarkdownRenderer({
  content,
  onOpenDrawer,
}: {
  content: string;
  onOpenDrawer?: (product: Product) => void;
}) {
  const mdComponents = {
    p: ({ children }: { children?: React.ReactNode }) => <p className="my-1.5">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="my-1.5 pl-5 list-disc">{children}</ul>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="mb-1">{children}</li>,
  };

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(PRODUCT_TAG_RE.source, "gi");
  let idx = 0;
  while ((match = re.exec(content)) !== null) {
    const textBefore = content.slice(last, match.index);
    if (textBefore) parts.push(<ReactMarkdown key={`t${idx}`} components={mdComponents}>{textBefore}</ReactMarkdown>);
    const slug = match[1];
    if (!isRenderableProductSlug(slug)) {
      parts.push(<ReactMarkdown key={`invalid-p${idx}`} components={mdComponents}>{slug}</ReactMarkdown>);
      last = match.index + match[0].length;
      idx++;
      continue;
    }
    parts.push(
      <div key={`p${idx}`} className="flex w-full">
        <ProductCardWrapper slug={slug} onOpenDrawer={onOpenDrawer} />
      </div>
    );
    last = match.index + match[0].length;
    idx++;
  }
  const remaining = content.slice(last);
  if (remaining) parts.push(<ReactMarkdown key={`t${idx}`} components={mdComponents}>{remaining}</ReactMarkdown>);
  return <>{parts}</>;
}
