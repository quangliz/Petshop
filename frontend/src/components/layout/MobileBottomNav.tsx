"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, ShoppingCart, User, Package, LogOut, LayoutDashboard } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getGuestCartCount } from "@/lib/guestCart";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

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

  const navItems = [
    { label: "Trang chủ", href: "/", icon: Home },
    { label: "Cửa hàng", href: "/shop", icon: Store },
    { label: "Giỏ hàng", href: "/cart", icon: ShoppingCart, badge: cartItemCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-neutral-100 flex items-center justify-around px-2 pb-safe pt-1 h-[60px] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative no-underline ${
              isActive ? "text-primary-600" : "text-neutral-500 hover:text-neutral-900"
            } transition-colors`}
          >
            <div className="relative">
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white leading-none min-w-[18px] text-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Profile / Menu Tab */}
      {user ? (
        <Sheet>
          <SheetTrigger className="flex flex-col items-center justify-center w-full h-full space-y-1 relative no-underline text-neutral-500 hover:text-neutral-900 transition-colors bg-transparent border-none cursor-pointer">
            <User size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Tài khoản</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 rounded-t-2xl z-[60] bg-white">
            <div className="p-4 border-b border-neutral-100 flex flex-col gap-1">
              <span className="text-sm font-semibold text-neutral-900">{user.full_name || user.email}</span>
              <span className="text-xs text-neutral-500">Xin chào!</span>
            </div>
            <div className="flex flex-col py-2">
              <Link href="/profile" className="px-5 py-3.5 flex items-center gap-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                <User size={18} className="text-neutral-400" /> Hồ sơ cá nhân
              </Link>
              <Link href="/orders" className="px-5 py-3.5 flex items-center gap-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                <Package size={18} className="text-neutral-400" /> Đơn hàng của tôi
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="px-5 py-3.5 flex items-center gap-3 text-sm font-semibold text-primary-600 hover:bg-primary-50">
                  <LayoutDashboard size={18} className="text-primary-500" /> Quản trị viên
                </Link>
              )}
              <div className="h-px bg-neutral-100 my-2 mx-5"></div>
              <button onClick={() => logout()} className="px-5 py-3.5 flex items-center gap-3 text-sm font-medium text-red-600 hover:bg-red-50 bg-transparent border-none text-left w-full">
                <LogOut size={18} className="text-red-500" /> Đăng xuất
              </button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Link
          href="/login"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative no-underline ${
            pathname === "/login" ? "text-primary-600" : "text-neutral-500 hover:text-neutral-900"
          } transition-colors`}
        >
          <User size={22} strokeWidth={pathname === "/login" ? 2.5 : 2} />
          <span className={`text-[10px] ${pathname === "/login" ? "font-semibold" : "font-medium"}`}>
            Tài khoản
          </span>
        </Link>
      )}
    </nav>
  );
}
