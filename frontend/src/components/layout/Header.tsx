"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { ShoppingCart, Search, PackageSearch, X, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getGuestCartCount } from "@/lib/guestCart";
import Image from 'next/image';
import { Product } from '@/lib/types';

import BrandLogo from "./BrandLogo";

const HeaderAuthSection = dynamic(() => import("./HeaderAuthSection"), {
  ssr: false,
  loading: () => <div className="w-[120px] h-[36px]" />,
});

const Logo = () => <BrandLogo size={42} />;

export default function Header() {
  const { user, token, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      api.get('/auth/me').then((res) => setUser(res.data)).catch(() => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        setUser(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (pathname === "/shop" && !mobileSearchOpen) {
      const timer = setTimeout(() => setSearchTerm(q), 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams, mobileSearchOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Focus mobile input when opened
  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen]);

  const suggestQ = debouncedTerm.length >= 2 ? debouncedTerm : "";
  const { data: suggestions, isFetching: suggestLoading } = useQuery({
    queryKey: ['product-suggest', suggestQ],
    queryFn: async () => {
      const res = await api.get(`/products/?q=${encodeURIComponent(suggestQ)}&size=5&page=1`);
      return res.data;
    },
    enabled: !!suggestQ,
    staleTime: 30_000,
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setSuggestOpen(false);
    setMobileSearchOpen(false);
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/cart/');
      return res.data;
    },
    enabled: !!user,
  });

  const serverCartCount = cart?.items?.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0) || 0;
  const [guestCartCount, setGuestCartCount] = useState(0);
  useEffect(() => {
    const count = getGuestCartCount();
    if (guestCartCount !== count) {
      const timer = setTimeout(() => setGuestCartCount(count), 0);
      return () => clearTimeout(timer);
    }
  }, [guestCartCount]);
  const cartItemCount = user ? serverCartCount : guestCartCount;

  return (
    <>
      <header className="sticky top-0 h-[72px] px-4 md:px-8 gap-3 md:gap-7 z-20 flex items-center w-full bg-white/90 backdrop-blur-md border-b border-neutral-100 shadow-sm">
        <Link href="/" className="cursor-pointer no-underline shrink-0 flex items-center">
          <Logo />
        </Link>

        <nav className="hidden md:flex gap-1">
          <Link href="/shop" className="px-3.5 py-2 rounded-lg text-sm font-medium text-neutral-700 no-underline transition-colors hover:bg-neutral-50 hover:text-neutral-900">
            Cửa hàng
          </Link>
          <Link href="/tra-cuu-don-hang" className="px-3.5 py-2 rounded-lg text-sm font-medium text-neutral-700 no-underline transition-colors hover:bg-neutral-50 hover:text-neutral-900">
            Tra cứu đơn hàng
          </Link>
        </nav>

        {/* Desktop Search */}
        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-[440px] relative ml-auto mr-4">
          <div className="h-[42px] w-full rounded-xl bg-neutral-50 border border-neutral-100 flex items-center px-3.5 gap-2.5 text-neutral-500 focus-within:bg-white focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-50 transition-all duration-200">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSuggestOpen(true); }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              placeholder="Tìm hạt, đồ chơi, cát vệ sinh..."
              className="flex-1 border-none outline-none bg-transparent text-[13px] text-neutral-800 placeholder-neutral-400"
            />
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 bg-white rounded border border-neutral-200 text-neutral-400 font-medium">⏎</kbd>
          </div>

          {suggestOpen && suggestQ && (
            <div className="absolute top-[48px] left-0 right-0 z-30 bg-white border border-neutral-100 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {suggestLoading && !suggestions ? (
                <div className="px-4 py-3.5 text-[13px] text-neutral-500 flex items-center justify-center">Đang tìm...</div>
              ) : suggestions?.items?.length ? (
                <>
                  {suggestions.items.map((p: Product) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      onClick={() => setSuggestOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 no-underline text-neutral-800 transition-colors hover:bg-neutral-50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 shrink-0 overflow-hidden relative border border-neutral-100">
                        {(p.thumbnail_url || p.images?.main) && (
                          <Image
                            src={p.thumbnail_url || p.images?.main || ''}
                            alt={p.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{p.brand || p.category_name}</div>
                      </div>
                      <div className="text-[13px] font-bold text-primary-600">
                        {(p.sale_price || p.price).toLocaleString()}đ
                      </div>
                    </Link>
                  ))}
                  <div
                    onMouseDown={(e) => { e.preventDefault(); submitSearch(e as unknown as React.FormEvent); }}
                    className="px-3.5 py-2.5 text-xs font-semibold text-primary-600 border-t border-neutral-100 cursor-pointer text-center hover:bg-primary-50 transition-colors"
                  >
                    Xem tất cả kết quả cho “{suggestQ}” →
                  </div>
                </>
              ) : (
                <div className="px-4 py-8 text-[13px] text-neutral-500 flex flex-col items-center justify-center gap-2 text-center">
                  <PackageSearch className="w-8 h-8 text-neutral-300" />
                  <div>Không tìm thấy sản phẩm nào phù hợp với &quot;{suggestQ}&quot;.</div>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="flex items-center gap-1 md:gap-2 ml-auto md:ml-0">
          {/* Mobile Search Toggle */}
          <button className="md:hidden p-2 text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors" onClick={() => {
            setSearchTerm("");
            setMobileSearchOpen(true);
          }}>
            <Search size={22} />
          </button>

          {/* Desktop Cart */}
          <Link href="/cart" className="hidden md:flex p-2 text-neutral-700 relative items-center hover:bg-neutral-100 rounded-full transition-colors">
            <ShoppingCart size={20} />
            {cartItemCount > 0 && (
              <div className="absolute top-0 right-0 min-w-[18px] h-[18px] rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </div>
            )}
          </Link>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-2 ml-1">
            <HeaderAuthSection />
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Search Overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 p-3 border-b border-neutral-100">
            <button onClick={() => setMobileSearchOpen(false)} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full transition-colors border-none bg-transparent">
              <ArrowLeft size={24} />
            </button>
            <form onSubmit={submitSearch} className="flex-1 relative">
              <input
                ref={mobileInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm hạt, đồ chơi, cát..."
                className="w-full h-[40px] pl-4 pr-10 rounded-full bg-neutral-100 border-none outline-none text-[15px] text-neutral-800 placeholder-neutral-400 focus:ring-2 focus:ring-primary-100 transition-all"
              />
              {searchTerm && (
                <button type="button" onClick={() => { setSearchTerm(""); mobileInputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 p-1 bg-transparent border-none">
                  <X size={18} />
                </button>
              )}
            </form>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            {suggestQ ? (
              <div className="flex flex-col">
                {suggestLoading && !suggestions ? (
                  <div className="p-6 text-sm text-neutral-500 text-center">Đang tìm...</div>
                ) : suggestions?.items?.length ? (
                  <>
                    {suggestions.items.map((p: Product) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.slug}`}
                        onClick={() => setMobileSearchOpen(false)}
                        className="flex items-center gap-3 p-4 border-b border-neutral-50 no-underline text-neutral-800 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 shrink-0 overflow-hidden relative border border-neutral-100">
                          {(p.thumbnail_url || p.images?.main) && (
                            <Image
                              src={p.thumbnail_url || p.images?.main || ''}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</div>
                          <div className="text-[12px] text-neutral-500 mt-0.5">{p.brand || p.category_name}</div>
                        </div>
                        <div className="text-[14px] font-bold text-primary-600">
                          {(p.sale_price || p.price).toLocaleString()}đ
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={submitSearch}
                      className="p-4 text-sm font-semibold text-primary-600 text-center hover:bg-primary-50 transition-colors border-none bg-transparent w-full cursor-pointer"
                    >
                      Xem tất cả kết quả cho “{suggestQ}” →
                    </button>
                  </>
                ) : (
                  <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                    <PackageSearch className="w-10 h-10 text-neutral-300" />
                    <div className="text-sm text-neutral-500">Không tìm thấy sản phẩm nào phù hợp với &quot;{suggestQ}&quot;.</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-sm text-neutral-400 text-center">
                Nhập tên sản phẩm để tìm kiếm
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
