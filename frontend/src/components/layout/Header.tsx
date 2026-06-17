"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { ShoppingCart, Search, PackageSearch, X, ArrowLeft, Menu, User, ChevronRight, LogOut, Package, Store, ClipboardList, ShieldCheck, MessageSquare, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getGuestCartCount } from "@/lib/guestCart";
import Image from 'next/image';
import { Product } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";

import BrandLogo from "./BrandLogo";

const HeaderAuthSection = dynamic(() => import("./HeaderAuthSection"), {
  ssr: false,
  loading: () => <Skeleton className="w-[26px] h-[26px] rounded-full bg-neutral-200/80" />,
});

const Logo = () => <BrandLogo size={42} />;
const ADMIN_ROLES = ["admin", "catalog_manager", "order_operator", "support", "content_manager"];

const SearchSuggestionSkeletons = () => (
  <div className="flex flex-col">
    {Array.from({ length: 5 }).map((_, item) => (
      <div key={item} className="flex items-center gap-3 p-4 border-b border-neutral-50">
        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-4/5 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

export default function Header() {
  const { user, isLoading, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      const res = await api.get(`/products/?q=${encodeURIComponent(suggestQ)}&size=5&page=1&short=true`);
      return res.data;
    },
    enabled: !!suggestQ,
    staleTime: 60_000,
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
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

  const isSolidBottomBar = isScrolled || isHovered;
  const isTopBarHidden = isScrolled;

  return (
    <>
      <header 
        className={`fixed top-0 z-20 w-full flex flex-col transition-all duration-300 ${isSolidBottomBar ? 'shadow-sm' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Orange Bar */}
        <div className={`bg-surface-invert text-white px-4 md:px-8 flex items-center justify-center md:justify-between font-vnmmono text-[10px] sm:text-[11px] md:text-xs overflow-hidden transition-all duration-300 ${isTopBarHidden ? 'h-0 opacity-0 pointer-events-none' : 'max-md:h-[18px] md:h-[34px] opacity-100'}`}>
          <div className="tracking-wide text-center w-full md:w-auto">Miễn phí vận chuyển cho đơn từ 300K</div>
          
          <div className="hidden md:flex items-center gap-4 md:gap-6">
            <Link href="/tra-cuu-don-hang" className="hover:text-white/80 transition-colors tracking-wide">
              TRA CỨU ĐƠN HÀNG
            </Link>
            <Link href="/shop" className="hover:text-white/80 transition-colors tracking-wide">
              CỬA HÀNG
            </Link>
            <Link href="/forum" className="hover:text-white/80 transition-colors tracking-wide">
              FORUM
            </Link>
            <div className="flex items-center gap-3 text-white">
              {!isTopBarHidden && (
                <>
                  <HeaderAuthSection />
                  <button 
                    className="text-inherit hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-1" 
                    onClick={() => {
                      setSearchTerm("");
                      setMobileSearchOpen(true);
                    }}
                  >
                    <Search size={18} strokeWidth={2} />
                  </button>

                  <Link href="/cart" className="relative flex items-center text-inherit hover:opacity-80 transition-opacity p-1">
                    <ShoppingCart size={18} strokeWidth={2} />
                    {cartItemCount > 0 && (
                      <div className="absolute top-0 -right-1 min-w-[16px] h-[16px] rounded-full bg-white text-surface-invert text-[10px] font-bold flex items-center justify-center px-1 border border-white">
                        {cartItemCount > 99 ? '99+' : cartItemCount}
                      </div>
                    )}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`${isTopBarHidden ? 'md:h-[49px]' : 'md:h-[73px]'} max-md:h-[65px] max-md:py-2 px-4 md:px-8 flex items-center justify-between border-b transition-all duration-300 ${isSolidBottomBar ? 'bg-[#fffff1] border-surface-invert' : 'max-md:bg-[#fffff1] max-md:border-surface-invert md:bg-transparent md:border-transparent'}`}>
           <div className="flex items-center gap-6 md:gap-8">
             <Link href="/" className={`cursor-pointer no-underline shrink-0 flex items-center transition-colors duration-300 text-surface-invert`}>
               <Logo />
             </Link>

             {/* <div className={`hidden md:flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity text-surface-invert`}>
               <span className="font-semibold text-[15px]">Sản phẩm</span>
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-inherit">
                 <path d="m6 9 6 6 6-6"/>
               </svg>
             </div> */}
           </div>

           {/* Mobile Icons */}
           <div className={`flex md:hidden items-center gap-3 text-surface-invert`}>
                 <Link href={user ? "/profile" : "/login"} className="text-inherit hover:opacity-80 transition-opacity flex items-center justify-center p-1">
                   <User size={18} strokeWidth={2} />
                 </Link>
                 <button
                   className="text-inherit hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-1"
                   onClick={() => {
                     setSearchTerm("");
                     setMobileSearchOpen(true);
                   }}
                 >
                   <Search size={18} strokeWidth={2} />
                 </button>

                 <Link href="/cart" className="relative flex items-center text-inherit hover:opacity-80 transition-opacity p-1">
                   <ShoppingCart size={18} strokeWidth={2} />
                   {cartItemCount > 0 && (
                     <div className="absolute top-0 -right-1 min-w-[16px] h-[16px] rounded-full bg-surface-invert text-white text-[10px] font-bold flex items-center justify-center px-1 border border-surface-invert">
                       {cartItemCount > 99 ? '99+' : cartItemCount}
                     </div>
                   )}
                 </Link>

                 <button className="text-inherit p-1 cursor-pointer bg-transparent border-none relative w-[28px] h-[28px] flex items-center justify-center" onClick={() => setMobileMenuOpen(o => !o)}>
                   <Menu size={20} strokeWidth={2} className={`absolute transition-all duration-200 ${mobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                   <X size={20} strokeWidth={2} className={`absolute transition-all duration-200 ${mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
                 </button>
           </div>

           {/* Desktop Icons (Visible only when isTopBarHidden is true) */}
           <div className={`hidden md:flex items-center gap-3 transition-opacity duration-300 text-surface-invert ${isTopBarHidden ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
             {isTopBarHidden && (
               <>
                 <Link href="/shop" className="text-inherit hover:opacity-80 transition-opacity p-1 flex items-center">
                   <Store size={18} strokeWidth={2} />
                 </Link>
                 <Link href="/forum" className="text-inherit hover:opacity-80 transition-opacity p-1 flex items-center">
                   <MessageSquare size={18} strokeWidth={2} />
                 </Link>
                 <HeaderAuthSection />
                 <button
                   className="text-inherit hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-1"
                   onClick={() => {
                     setSearchTerm("");
                     setMobileSearchOpen(true);
                   }}
                 >
                   <Search size={18} strokeWidth={2} />
                 </button>

                 <Link href="/cart" className="relative flex items-center text-inherit hover:opacity-80 transition-opacity p-1">
                   <ShoppingCart size={18} strokeWidth={2} />
                   {cartItemCount > 0 && (
                     <div className="absolute top-0 -right-1 min-w-[16px] h-[16px] rounded-full bg-surface-invert text-white text-[10px] font-bold flex items-center justify-center px-1 border border-surface-invert">
                       {cartItemCount > 99 ? '99+' : cartItemCount}
                     </div>
                   )}
                 </Link>
               </>
             )}
           </div>
        </div>
      </header>

      {/* Mobile Full-Screen Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-[65px] left-0 right-0 bottom-0 z-[90] bg-[#fffff1] flex flex-col animate-in slide-in-from-top-2 duration-300 md:hidden">
          <div className="flex-1 overflow-y-auto">
            {/* User Section */}
            {!isLoading && (
              user ? (
                <div className="px-5 py-5 border-b border-neutral-200">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 no-underline group"
                  >
                    <div className="w-11 h-11 rounded-full bg-surface-invert text-white flex items-center justify-center shrink-0">
                      <User size={20} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-surface-invert truncate">{user.full_name}</div>
                      <div className="text-[12px] text-neutral-500 mt-0.5">Xem hồ sơ cá nhân</div>
                    </div>
                    <ChevronRight size={18} className="text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              ) : (
                <div className="px-5 py-5 border-b border-neutral-200 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <User size={20} strokeWidth={2} className="text-neutral-400" />
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 rounded-full bg-surface-invert text-white text-[13px] font-semibold no-underline hover:opacity-90 transition-opacity"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 rounded-full border border-surface-invert text-surface-invert text-[13px] font-semibold no-underline hover:bg-neutral-100 transition-colors"
                    >
                      Đăng ký
                    </Link>
                  </div>
                </div>
              )
            )}

            {/* Navigation Links */}
            <nav className="flex flex-col py-2">
              <Link href="/shop" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 px-5 py-4 no-underline text-surface-invert border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                <Store size={20} strokeWidth={1.75} className="text-neutral-500 shrink-0" />
                <span className="text-[15px] font-semibold">Cửa hàng</span>
              </Link>
              <Link href="/tra-cuu-don-hang" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 px-5 py-4 no-underline text-surface-invert border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                <ClipboardList size={20} strokeWidth={1.75} className="text-neutral-500 shrink-0" />
                <span className="text-[15px] font-semibold">Tra cứu đơn hàng</span>
              </Link>
              <Link href="/forum" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-4 px-5 py-4 no-underline text-surface-invert border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                <MessageSquare size={20} strokeWidth={1.75} className="text-neutral-500 shrink-0" />
                <span className="text-[15px] font-semibold">Forum</span>
              </Link>
              {user && (
                <>
                  <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-5 py-4 no-underline text-surface-invert border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <Heart size={20} strokeWidth={1.75} className="text-neutral-500 shrink-0" />
                    <span className="text-[15px] font-semibold">Sản phẩm yêu thích</span>
                  </Link>
                  <Link href="/orders" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-5 py-4 no-underline text-surface-invert border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <Package size={20} strokeWidth={1.75} className="text-neutral-500 shrink-0" />
                    <span className="text-[15px] font-semibold">Đơn hàng của tôi</span>
                  </Link>
                  {ADMIN_ROLES.includes(user.role) && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 px-5 py-4 no-underline text-surface-invert border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <ShieldCheck size={20} strokeWidth={1.75} className="text-[oklch(0.61_0.19_46)] shrink-0" />
                      <span className="text-[15px] font-semibold text-[oklch(0.61_0.19_46)]">Bảng điều khiển Admin</span>
                    </Link>
                  )}
                </>
              )}
            </nav>

            {/* Logout */}
            {user && (
              <div className="px-5 pt-2 pb-8">
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 text-[14px] font-semibold text-red-500 bg-transparent border-none cursor-pointer p-0 hover:opacity-70 transition-opacity"
                >
                  <LogOut size={18} strokeWidth={1.75} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-Screen Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
                  <SearchSuggestionSkeletons />
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
                          {(p.brand || p.category_name) && (
                            <div className="text-[12px] text-neutral-500 mt-0.5">{p.brand || p.category_name}</div>
                          )}
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
