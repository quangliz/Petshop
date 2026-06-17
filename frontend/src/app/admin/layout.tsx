"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { LayoutDashboard, Package, ShoppingCart, Users, Image, ArrowLeft, Menu, BookOpen, Database, ShieldAlert, Loader2, MessageSquare, Ticket } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const menuItems = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/admin/products", label: "Sản phẩm", icon: Package, roles: ["admin", "catalog_manager", "support"] },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart, roles: ["admin", "order_operator", "support"] },
  { href: "/admin/promotions", label: "Khuyến mãi", icon: Ticket, roles: ["admin", "catalog_manager"] },
  { href: "/admin/users", label: "Người dùng", icon: Users, roles: ["admin"] },
  { href: "/admin/banners", label: "Banner", icon: Image, roles: ["admin"] },
  { href: "/admin/knowledge", label: "Tri thức", icon: BookOpen, roles: ["admin", "content_manager"] },
  { href: "/admin/embeddings", label: "Embeddings", icon: Database, roles: ["admin", "content_manager"] },
  { href: "/admin/forum", label: "Forum", icon: MessageSquare, roles: ["admin", "support", "content_manager"] },
];

const SidebarContent = ({ pathname, userRole }: { pathname: string; userRole: string }) => {
  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));
  return (
    <>
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-orange-400">🐾 ThePawsome Admin</h1>
        <p className="text-xs text-gray-400 mt-1">Bảng điều khiển</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
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
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!["admin", "catalog_manager", "order_operator", "support", "content_manager"].includes(user.role)) {
        router.replace("/");
      }
    }
  }, [user, isLoading, router, pathname]);

  useEffect(() => {
    if (user) {
      const allowedPaths = menuItems.filter(item => item.roles.includes(user.role)).map(item => item.href);
      if (pathname === "/admin" && user.role !== "admin" && allowedPaths.length > 0) {
        router.replace(allowedPaths[0]);
      }
    }
  }, [user, pathname, router]);

  // Close mobile menu on route change without calling setState in an effect
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user || !["admin", "catalog_manager", "order_operator", "support", "content_manager"].includes(user.role)) {
    return null;
  }

  const currentMenuItem = menuItems.find(item => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)));
  const hasAccess = !currentMenuItem || currentMenuItem.roles.includes(user.role);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col shrink-0 min-h-screen sticky top-0">
        <SidebarContent pathname={pathname} userRole={user.role} />
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
            <span className="text-sm text-gray-500 hidden sm:inline">Xin chào, <strong>{user?.full_name}</strong> ({user?.role})</span>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger render={
                <button className="md:hidden p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-md">
                  <Menu size={20} />
                </button>
              } />
              <SheetContent side="right" className="p-0 bg-gray-900 border-l-gray-800 text-white w-64 flex flex-col">
                <SidebarContent pathname={pathname} userRole={user.role} />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {hasAccess ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
              <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
              <h1 className="text-2xl font-bold mb-2 text-gray-800">Không có quyền truy cập</h1>
              <p className="text-gray-500 text-sm mb-6 max-w-sm leading-relaxed">
                Tài khoản của bạn ({user.role}) không được phân quyền để truy cập tính năng này.
              </p>
              <Link
                href="/admin"
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-orange-900/10"
                style={{ textDecoration: 'none' }}
              >
                Quay lại trang chính
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
