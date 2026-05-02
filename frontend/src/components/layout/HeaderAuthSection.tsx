"use client";
import React from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function HeaderAuthSection() {
  const { user, isLoading, logout } = useAuthStore();

  if (isLoading) {
    return <div style={{ width: 120, height: 36 }} />;
  }

  if (user) {
    return (
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
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Link href="/login" className="btn btn-ghost btn-sm">Đăng nhập</Link>
      <Link href="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
    </div>
  );
}
