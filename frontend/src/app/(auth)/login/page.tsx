"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getGuestCart, clearGuestCart } from '@/lib/guestCart';
import { Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const loginSchema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });
  const [serverError, setServerError] = useState('');
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);
      
      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const token = res.data.access_token;
      
      const userRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAuth(userRes.data, token);
      const guestCart = getGuestCart();
      if (guestCart.length > 0) {
        for (const item of guestCart) {
          try { await api.post('/cart/items', item, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
        }
        clearGuestCart();
      }
      toast.success('Đăng nhập thành công!');
      router.push('/');
    } catch {
      setServerError('Email hoặc mật khẩu không chính xác');
      toast.error('Đăng nhập thất bại');
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10" style={{ 
      background: 'radial-gradient(circle at top right, var(--primary-50), transparent), radial-gradient(circle at bottom left, var(--teal-50), transparent)'
    }}>
      <div className="card w-full max-w-md mx-auto p-8 md:p-10">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--primary-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 16px var(--primary-100)' }}>
            <Sparkles size={32} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 8px' }}>Chào mừng trở lại!</h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-500)' }}>Đăng nhập để tiếp tục chăm sóc bé pet của bạn</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {serverError && <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{serverError}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--neutral-400)' }} />
              <input 
                {...register('email')}
                type="email"
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: `1.5px solid ${errors.email ? 'var(--danger)' : 'var(--neutral-200)'}`, outline: 'none' }}
                placeholder="pet@example.com"
              />
            </div>
            {errors.email && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6, fontWeight: 600 }}>{errors.email.message}</p>}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>Mật khẩu</label>
              <Link href="/forgot-password" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none' }}>Quên mật khẩu?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--neutral-400)' }} />
              <input 
                {...register('password')}
                type="password"
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: `1.5px solid ${errors.password ? 'var(--danger)' : 'var(--neutral-200)'}`, outline: 'none' }}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6, fontWeight: 600 }}>{errors.password.message}</p>}
          </div>
          <button 
            type="submit" disabled={isSubmitting}
            className="btn btn-primary btn-lg" 
            style={{ width: '100%', height: 52, borderRadius: 14, marginTop: 12, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isSubmitting ? <><Spinner size={18} /> Đang đăng nhập...</> : (
              <>Đăng nhập <ArrowRight size={18} style={{ marginLeft: 8 }} /></>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--neutral-200)' }} />
          <span style={{ fontSize: 12, color: 'var(--neutral-400)', fontWeight: 600 }}>HOẶC</span>
          <div style={{ flex: 1, height: 1, background: 'var(--neutral-200)' }} />
        </div>
        <div style={{ marginTop: 16 }}>
          <GoogleAuthButton />
        </div>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--neutral-500)' }}>
          Chưa có tài khoản? <Link href="/register" style={{ fontWeight: 700, color: 'var(--primary-600)', textDecoration: 'none' }}>Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
