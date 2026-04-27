"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Mail, Lock, Sparkles, User, ArrowRight } from 'lucide-react';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', {
        email,
        password,
        full_name: fullName
      });
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      router.push('/login');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : (detail || 'Đăng ký thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10" style={{ 
      background: 'radial-gradient(circle at top right, var(--primary-50), transparent), radial-gradient(circle at bottom left, var(--teal-50), transparent)'
    }}>
      <div className="card w-full max-w-md mx-auto p-8 md:p-10">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--teal-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 16px var(--teal-100)' }}>
            <Sparkles size={32} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px' }}>Tạo tài khoản</h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-500)' }}>Gia nhập cộng đồng ThePawsome ngay hôm nay</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Họ và tên</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--neutral-400)' }} />
              <input 
                type="text" required 
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }}
                placeholder="Nguyễn Văn A"
                value={fullName} onChange={e => setFullName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--neutral-400)' }} />
              <input 
                type="email" required 
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }}
                placeholder="pet@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--neutral-400)' }} />
              <input 
                type="password" required 
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }}
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button 
            type="submit" disabled={loading}
            className="btn btn-teal btn-lg" 
            style={{ width: '100%', height: 52, borderRadius: 14, marginTop: 12, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? "Đang xử lý..." : (
              <>Đăng ký tài khoản <ArrowRight size={18} style={{ marginLeft: 8 }} /></>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--neutral-200)' }} />
          <span style={{ fontSize: 12, color: 'var(--neutral-400)', fontWeight: 600 }}>HOẶC</span>
          <div style={{ flex: 1, height: 1, background: 'var(--neutral-200)' }} />
        </div>
        <div style={{ marginTop: 16 }}>
          <GoogleAuthButton label="Đăng ký với Google" />
        </div>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--neutral-500)' }}>
          Đã có tài khoản? <Link href="/login" style={{ fontWeight: 700, color: 'var(--primary-600)', textDecoration: 'none' }}>Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}
