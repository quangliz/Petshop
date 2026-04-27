"use client";
import React from "react";
import Link from "next/link";
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

export default function Footer() {
  return (
    <footer className="px-6 md:px-10 pt-12 md:pt-16 pb-6 mt-20" style={{ background: 'var(--neutral-900)', color: 'var(--neutral-400)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_2fr_1.3fr] gap-8 lg:gap-12 max-w-[1200px] mx-auto">
        <div>
          <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}><Logo /></div>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 16, maxWidth: 300 }}>
            Shop thú cưng thông minh — nơi AI hiểu từng chi tiết về bé pet của bạn.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Danh mục</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Thức ăn</Link>
              <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Đồ chơi</Link>
              <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Phụ kiện</Link>
              <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Sức khỏe</Link>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Hỗ trợ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13 }}>FAQ</span>
              <span style={{ fontSize: 13 }}>Liên hệ</span>
              <span style={{ fontSize: 13 }}>Đổi trả</span>
              <span style={{ fontSize: 13 }}>Vận chuyển</span>
            </div>
          </div>
        </div>
        <div>
          <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Nhận tin</h4>
          <div style={{ display: 'flex', gap: 0, background: 'var(--neutral-800)', borderRadius: 10, padding: 4 }}>
            <input 
              placeholder="email@thepawsome.vn" 
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '8px 12px', color: 'white', fontSize: 13 }} 
            />
            <button className="btn btn-primary btn-sm">Đăng ký</button>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--neutral-800)', marginTop: 48, paddingTop: 20, fontSize: 12, textAlign: 'center', color: 'var(--neutral-500)' }}>
        © {new Date().getFullYear()} ThePawsome · Đồ án tốt nghiệp · Built with love for pets
      </div>
    </footer>
  );
}
