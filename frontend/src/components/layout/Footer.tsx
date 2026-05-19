"use client";
import React from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import BrandLogo from "./BrandLogo";

const Logo = () => <BrandLogo size={42} />;

const SocialIcon = ({ href, label, children }: { href: string; label: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" aria-label={label}
    style={{
      width: 36, height: 36, borderRadius: 10, background: 'var(--neutral-800)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--neutral-400)', transition: 'all 150ms ease', textDecoration: 'none',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-500)'; e.currentTarget.style.color = 'white'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'var(--neutral-800)'; e.currentTarget.style.color = 'var(--neutral-400)'; }}
  >
    {children}
  </a>
);

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
          <div className="flex gap-2 mt-4">
            <SocialIcon href="https://facebook.com" label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://instagram.com" label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://tiktok.com" label="TikTok">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
            </SocialIcon>
          </div>
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
