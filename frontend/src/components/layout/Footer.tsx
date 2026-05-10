"use client";
import React from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import BrandLogo from "./BrandLogo";

const Logo = () => <BrandLogo size={42} />;

export default function Footer() {
  return (
    <footer
      className="px-6 md:px-10 pt-12 md:pt-16 pb-6 mt-20 text-neutral-400"
      style={{ background: 'var(--neutral-900)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_2fr_1.3fr] gap-8 lg:gap-12 max-w-[1200px] mx-auto">
        {/* Brand */}
        <div>
          <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}><Logo /></div>
          <p className="text-[13px] leading-[1.6] max-w-[300px] -mt-1.5">
            Shop thú cưng thông minh.
          </p>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="text-white text-[13px] font-bold mb-3.5">Danh mục</h4>
            <div className="flex flex-col gap-2">
              <Link href="/shop" className="text-[13px] text-inherit no-underline hover:text-white transition-colors">Thức ăn</Link>
              <Link href="/shop" className="text-[13px] text-inherit no-underline hover:text-white transition-colors">Đồ chơi</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white text-[13px] font-bold mb-3.5">Hỗ trợ</h4>
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px]">FAQ</span>
              <a href="mailto:qcontact.12@gmail.com" className="text-[13px] flex items-center gap-2 text-inherit no-underline hover:text-white transition-colors">
                <Mail size={14} /> qcontact.12@gmail.com
              </a>
              <a href="tel:+84888987400" className="text-[13px] flex items-center gap-2 text-inherit no-underline hover:text-white transition-colors">
                <Phone size={14} /> +84888987400
              </a>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="text-white text-[13px] font-bold mb-3.5">Nhận tin</h4>
          <div className="flex rounded-[10px] p-1" style={{ background: 'var(--neutral-800)' }}>
            <input
              placeholder="email@example.com"
              className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-white text-[13px] placeholder:text-neutral-500"
            />
            <button
              className="h-9 px-4 rounded-[8px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 border-none cursor-pointer"
              style={{ background: 'var(--primary-600)' }}
            >
              Đăng ký
            </button>
          </div>
        </div>
      </div>

      <div className="border-t mt-12 pt-5 text-[12px] text-center text-neutral-500" style={{ borderColor: 'var(--neutral-800)' }}>
        © {new Date().getFullYear()} ThePawsome · Đồ án tốt nghiệp
      </div>
    </footer>
  );
}
