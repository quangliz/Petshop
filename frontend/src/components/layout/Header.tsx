"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { ShoppingCart, Search, Menu } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getGuestCartCount } from "@/lib/guestCart";
import Image from 'next/image';
import { Product } from '@/lib/types';

import BrandLogo from "./BrandLogo";

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <BrandLogo size={32} />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--neutral-900)' }}>ThePawsome</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--teal-600)', letterSpacing: '0.15em', marginTop: 2 }}>AI · BETA</span>
    </div>
  </div>
);

export default function Header() {
  const { user, token, setUser, logout } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (pathname === "/shop" && searchTerm !== q) {
      const timer = setTimeout(() => setSearchTerm(q), 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams, searchTerm]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

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
    <header className="sticky top-0 h-[68px] px-4 md:px-8 gap-3 md:gap-7 z-20 flex items-center w-full" style={{
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--neutral-100)',
    }}>
      <Link href="/" style={{ cursor: 'pointer', textDecoration: 'none' }}>
        <Logo />
      </Link>

      <nav className="hidden md:flex" style={{ gap: 4 }}>
        <Link href="/shop" style={{
          padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)',
          textDecoration: 'none', transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          Cửa hàng
        </Link>
      </nav>

      <form onSubmit={submitSearch} className="hidden md:flex" style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
        <div style={{
          height: 42, borderRadius: 12, background: 'var(--neutral-50)',
          border: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 10, color: 'var(--neutral-500)',
        }}>
          <Search size={16} />
          <input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            placeholder="Tìm hạt, đồ chơi, cát vệ sinh..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--neutral-800)',
            }}
          />
          <kbd style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px',
            background: 'white', borderRadius: 4, border: '1px solid var(--neutral-200)',
            color: 'var(--neutral-500)',
          }}>⏎</kbd>
        </div>

        {suggestOpen && suggestQ && (
          <div style={{
            position: 'absolute', top: 48, left: 0, right: 0, zIndex: 30,
            background: 'white', border: '1px solid var(--neutral-100)', borderRadius: 12,
            boxShadow: 'var(--shadow-md)', overflow: 'hidden',
          }}>
            {suggestLoading && !suggestions ? (
              <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--neutral-500)' }}>Đang tìm...</div>
            ) : suggestions?.items?.length ? (
              <>
                {suggestions.items.map((p: Product) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    onClick={() => setSuggestOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      textDecoration: 'none', color: 'var(--neutral-800)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--neutral-100)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{p.brand || p.category_name}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-600)' }}>
                      {(p.sale_price || p.price).toLocaleString()}đ
                    </div>
                  </Link>
                ))}
                <div
                  onMouseDown={(e) => { e.preventDefault(); submitSearch(e as unknown as React.FormEvent); }}
                  style={{
                    padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--primary-600)',
                    borderTop: '1px solid var(--neutral-100)', cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  Xem tất cả kết quả cho “{suggestQ}” →
                </div>
              </>
            ) : (
              <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--neutral-500)' }}>Không tìm thấy sản phẩm</div>
            )}
          </div>
        )}
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <button className="md:hidden p-2 text-neutral-700" onClick={() => setMobileSearchOpen(!mobileSearchOpen)}>
          <Search size={20} />
        </button>

        <Link href="/cart" style={{ padding: 10, color: 'var(--neutral-700)', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <ShoppingCart size={20} />
          {cartItemCount > 0 && (
            <div style={{
              position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18,
              borderRadius: 9, background: 'var(--primary-500)', color: 'white',
              fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center',
              justifyContent: 'center', padding: '0 5px'
            }}>
              {cartItemCount}
            </div>
          )}
        </Link>

        <div className="hidden md:flex items-center gap-2 ml-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px',
                  borderRadius: 40, border: '1px solid var(--neutral-200)', background: 'white',
                  cursor: 'pointer', outline: 'none'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 15, background: 'oklch(0.9 0.06 85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--neutral-800)'
                  }}>
                    {user.full_name.charAt(0)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)' }}>{user.full_name.split(' ').pop()}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ borderRadius: 12, padding: 8, minWidth: 200, boxShadow: 'var(--shadow-md)', background: 'white', zIndex: 50, border: '1px solid var(--neutral-100)' }}>
                <DropdownMenuItem style={{ fontWeight: 700, fontSize: 14, padding: '10px 12px' }}>{user.full_name}</DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem render={<Link href="/admin" style={{ color: 'var(--primary-600)', fontWeight: 600 }} />}>Bảng cấu hình Admin</DropdownMenuItem>
                )}
                <DropdownMenuItem render={<Link href="/profile" />}>Hồ sơ cá nhân</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/orders" />}>Đơn hàng của tôi</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} style={{ color: 'var(--danger)', cursor: 'pointer' }}>Đăng xuất</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/login" className="btn btn-ghost btn-sm">Đăng nhập</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
            </div>
          )}
        </div>

        <div className="md:hidden ml-1">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger render={
              <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Menu size={24} />
              </button>
            } />
            <SheetContent side="left" className="p-0 flex flex-col w-[280px] bg-white z-[60]">
              <div className="p-6 border-b border-neutral-100">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}><Logo /></Link>
              </div>
              <div className="flex flex-col py-4 flex-1 overflow-y-auto">
                 <Link href="/" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors">Trang chủ</Link>
                 <Link href="/shop" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors">Cửa hàng</Link>
                 <Link href="/tra-cuu-don-hang" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors">Tra cứu đơn hàng</Link>
                 <Link href="/cart" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
                   Giỏ hàng
                   {cartItemCount > 0 && (
                     <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartItemCount}</span>
                   )}
                 </Link>
                 <div className="h-px bg-neutral-100 my-2 w-full"></div>
                 {user ? (
                    <>
                      <div className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400">Tài khoản</div>
                      <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors">Hồ sơ cá nhân</Link>
                      <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors">Đơn hàng của tôi</Link>
                      {user.role === 'admin' && (
                         <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="px-6 py-3 text-primary-600 font-semibold hover:bg-primary-50 transition-colors">Bảng cấu hình Admin</Link>
                      )}
                      <div className="h-px bg-neutral-100 my-2 w-full"></div>
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="px-6 py-3 text-left text-red-600 hover:bg-red-50 transition-colors font-medium">Đăng xuất</button>
                    </>
                 ) : (
                    <div className="flex flex-col gap-3 px-6 mt-2">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-ghost w-full justify-center border border-neutral-200">Đăng nhập</Link>
                      <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary w-full justify-center">Đăng ký</Link>
                    </div>
                 )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden absolute top-[68px] left-0 right-0 p-4 bg-white border-b border-neutral-100 z-30 shadow-md">
          <form onSubmit={(e) => { submitSearch(e); setMobileSearchOpen(false); }} style={{ position: 'relative' }}>
             <div style={{
               height: 42, borderRadius: 12, background: 'var(--neutral-50)',
               border: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center',
               padding: '0 14px', gap: 10, color: 'var(--neutral-500)',
             }}>
               <Search size={16} />
               <input
                 autoFocus
                 value={searchTerm}
                 onChange={(e) => { setSearchTerm(e.target.value); setSuggestOpen(true); }}
                 placeholder="Tìm hạt, đồ chơi, cát..."
                 style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
               />
             </div>
             {suggestOpen && suggestQ && (
                <div style={{
                  position: 'absolute', top: 48, left: 0, right: 0, zIndex: 30,
                  background: 'white', border: '1px solid var(--neutral-100)', borderRadius: 12,
                  boxShadow: 'var(--shadow-md)', overflow: 'hidden',
                }}>
                  {suggestLoading && !suggestions ? (
                    <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--neutral-500)' }}>Đang tìm...</div>
                  ) : suggestions?.items?.length ? (
                    <>
                      {suggestions.items.slice(0, 3).map((p: Product) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.slug}`}
                          onClick={() => { setSuggestOpen(false); setMobileSearchOpen(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                            textDecoration: 'none', color: 'var(--neutral-800)',
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--neutral-100)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
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
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{p.brand || p.category_name}</div>
                          </div>
                        </Link>
                      ))}
                      <div
                        onMouseDown={(e) => { e.preventDefault(); submitSearch(e as unknown as React.FormEvent); setMobileSearchOpen(false); }}
                        style={{
                          padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--primary-600)',
                          borderTop: '1px solid var(--neutral-100)', cursor: 'pointer', textAlign: 'center',
                        }}
                      >
                        Xem tất cả →
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--neutral-500)' }}>Không tìm thấy sản phẩm</div>
                  )}
                </div>
              )}
          </form>
        </div>
      )}
    </header>
  );
}
