"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { LayoutDashboard, Package, ShoppingCart, Users, Image, ArrowLeft, Menu, BookOpen, Database } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const menuItems = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/banners", label: "Banner", icon: Image },
  { href: "/admin/knowledge", label: "Tri thức", icon: BookOpen },
  { href: "/admin/embeddings", label: "Embeddings", icon: Database },
];

const SidebarContent = ({ pathname }: { pathname: string }) => (
  <>
    <div className="p-6 border-b border-gray-700">
      <h1 className="text-xl font-bold text-orange-400">🐾 ThePawsome Admin</h1>
      <p className="text-xs text-gray-400 mt-1">Bảng điều khiển</p>
    </div>
    <nav className="flex-1 p-4 space-y-1">
      {menuItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-orange-600 text-white shadow"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
    <div className="p-4 border-t border-gray-700">
      <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-3 h-3" /> Về trang chủ
      </Link>
    </div>
  </>
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user !== undefined && user?.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  // Close mobile menu on route change without calling setState in an effect
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col shrink-0 min-h-screen sticky top-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-gray-700">
              {menuItems.find((m) => m.href === pathname)?.label ?? "Admin"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">Xin chào, <strong>{user?.full_name}</strong></span>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger render={
                <button className="md:hidden p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-md">
                  <Menu size={20} />
                </button>
              } />
              <SheetContent side="right" className="p-0 bg-gray-900 border-l-gray-800 text-white w-64 flex flex-col">
                <SidebarContent pathname={pathname} />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
