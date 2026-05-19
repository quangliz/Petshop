"use client";
import React from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HeaderAuthSection() {
  const { user, isLoading, logout } = useAuthStore();

  if (isLoading) {
    return <Skeleton className="w-[26px] h-[26px] rounded-full bg-neutral-200/80" />;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="text-inherit hover:opacity-80 transition-opacity border-none bg-transparent flex items-center justify-center p-1 outline-none cursor-pointer">
          <User size={18} strokeWidth={2} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-[12px] p-2 min-w-[200px] z-50 bg-white border border-neutral-100"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <DropdownMenuItem className="font-bold text-[14px] px-3 py-2.5">{user.full_name}</DropdownMenuItem>
          {user.role === 'admin' && (
            <DropdownMenuItem render={<Link href="/admin" className="text-[oklch(0.61_0.19_46)] font-semibold" />}>Bảng cấu hình Admin</DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/profile" />}>Hồ sơ cá nhân</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/orders" />}>Đơn hàng của tôi</DropdownMenuItem>
          <DropdownMenuItem onClick={logout} className="cursor-pointer" style={{ color: "var(--danger)" }}>Đăng xuất</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href="/login" className="text-inherit hover:opacity-80 transition-opacity flex items-center justify-center p-1">
      <User size={18} strokeWidth={2} />
    </Link>
  );
}
