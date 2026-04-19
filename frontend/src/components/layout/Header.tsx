"use client";
import React from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { ShoppingCart, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

const Logo = ({ size = 28 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
      boxShadow: '0 4px 12px oklch(0.68 0.19 50 / 0.35)',
    }}>
      <svg width={size*0.6} height={size*0.6} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/>
        <circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/>
        <path d="M7 19c0-3 2.2-5 5-5s5 2 5 5c0 1.5-1 2-2.5 2h-5C8 21 7 20.5 7 19z"/>
      </svg>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--neutral-900)' }}>PetShop</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--teal-600)', letterSpacing: '0.15em', marginTop: 2 }}>AI · BETA</span>
    </div>
  </div>
);

export default function Header() {
  const { user, logout } = useAuthStore();
  
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/cart');
      return res.data;
    },
    enabled: !!user,
  });

  const cartItemCount = cart?.items?.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0) || 0;

  return (
    <header style={{
      height: 68, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--neutral-100)',
      display: 'flex', alignItems: 'center', padding: '0 32px', gap: 28,
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <Link href="/" style={{ cursor: 'pointer', textDecoration: 'none' }}>
        <Logo />
      </Link>

      <nav style={{ display: 'flex', gap: 4 }}>
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

      <div style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
        <div style={{
          height: 42, borderRadius: 12, background: 'var(--neutral-50)',
          border: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 10, color: 'var(--neutral-500)',
        }}>
          <Search size={16} />
          <input placeholder="Tìm hạt, đồ chơi, cát vệ sinh..." style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--neutral-800)',
          }} />
          <kbd style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px',
            background: 'white', borderRadius: 4, border: '1px solid var(--neutral-200)',
            color: 'var(--neutral-500)',
          }}>⌘K</kbd>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
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

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{
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
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ borderRadius: 12, padding: 8, minWidth: 200, boxShadow: 'var(--shadow-md)' }}>
              <DropdownMenuItem style={{ fontWeight: 700, fontSize: 14, padding: '10px 12px' }}>{user.full_name}</DropdownMenuItem>
              {user.role === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Bảng cấu hình Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild><Link href="/profile">Hồ sơ cá nhân</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/orders">Đơn hàng của tôi</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={logout} style={{ color: 'var(--danger)', cursor: 'pointer' }}>Đăng xuất</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <Link href="/login" className="btn btn-ghost btn-sm">Đăng nhập</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
}
