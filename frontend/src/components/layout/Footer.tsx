"use client";
import React from "react";
import Link from "next/link";

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

export default function Footer() {
  return (
    <footer style={{ background: 'var(--neutral-900)', color: 'var(--neutral-400)', padding: '64px 40px 24px', marginTop: 80 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.3fr', gap: 48, maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}><Logo /></div>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 16, maxWidth: 300 }}>
            Shop thú cưng thông minh — nơi AI hiểu từng chi tiết về bé pet của bạn.
          </p>
        </div>
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
        <div>
          <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Nhận tin</h4>
          <div style={{ display: 'flex', gap: 0, background: 'var(--neutral-800)', borderRadius: 10, padding: 4 }}>
            <input 
              placeholder="email@petshop.vn" 
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '8px 12px', color: 'white', fontSize: 13 }} 
            />
            <button className="btn btn-primary btn-sm">Đăng ký</button>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--neutral-800)', marginTop: 48, paddingTop: 20, fontSize: 12, textAlign: 'center', color: 'var(--neutral-500)' }}>
        © {new Date().getFullYear()} PetShop AI · Đồ án tốt nghiệp · Built with love for pets
      </div>
    </footer>
  );
}
