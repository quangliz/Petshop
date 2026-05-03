"use client";
import React from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import BrandLogo from "./BrandLogo";

const Logo = () => <BrandLogo size={42} />;

export default function Footer() {
  return (
    <footer className="px-6 md:px-10 pt-12 md:pt-16 pb-6 mt-20" style={{ background: 'var(--neutral-900)', color: 'var(--neutral-400)' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_2fr_1.3fr] gap-8 lg:gap-12 max-w-[1200px] mx-auto">
        <div>
          <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}><Logo /></div>
          <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 300, marginTop: -6 }}>
            Shop thú cưng thông minh.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Danh mục</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Thức ăn</Link>
              <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Đồ chơi</Link>
              {/* <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Phụ kiện</Link>
              <Link href="/shop" style={{ fontSize: 13, color: 'inherit', textDecoration: 'none' }}>Sức khỏe</Link> */}
            </div>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Hỗ trợ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13 }}>FAQ</span>
              <a href="mailto:qcontact.12@gmail.com" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
                <Mail size={14} />
                qcontact.12@gmail.com
              </a>
              <a href="tel:+84888987400" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
                <Phone size={14} />
                +84888987400
              </a>
            </div>
          </div>
        </div>
        <div>
          <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Nhận tin</h4>
          <div style={{ display: 'flex', gap: 0, background: 'var(--neutral-800)', borderRadius: 10, padding: 4 }}>
            <input
              placeholder="email@example.com"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '8px 12px', color: 'white', fontSize: 13 }}
            />
            <button className="btn btn-primary btn-sm">Đăng ký</button>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--neutral-800)', marginTop: 48, paddingTop: 20, fontSize: 12, textAlign: 'center', color: 'var(--neutral-500)' }}>
        © {new Date().getFullYear()} ThePawsome · Đồ án tốt nghiệp
      </div>
    </footer>
  );
}
