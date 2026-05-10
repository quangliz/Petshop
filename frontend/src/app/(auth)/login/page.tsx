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
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10"
      style={{ background: 'radial-gradient(circle at top right, var(--primary-50), transparent), radial-gradient(circle at bottom left, var(--teal-50), transparent)' }}
    >
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 md:p-10">
        {/* Icon Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white mx-auto mb-5" style={{ background: 'var(--primary-600)', boxShadow: '0 8px 16px var(--primary-100)' }}>
            <Sparkles size={32} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.025em] mb-2">Chào mừng trở lại!</h1>
          <p className="text-[14px] text-neutral-500">Đăng nhập để tiếp tục chăm sóc bé pet của bạn</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {serverError && (
            <div className="px-3 py-3 rounded-[10px] text-[13px] text-center font-semibold" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {serverError}
            </div>
          )}
          <div>
            <label className="block text-[13px] font-bold mb-2">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
              <input
                {...register('email')}
                type="email"
                className="w-full py-3 pl-[42px] pr-4 rounded-[12px] text-[14px] outline-none transition-colors"
                style={{ border: `1.5px solid ${errors.email ? 'var(--danger)' : 'var(--neutral-200)'}` }}
                placeholder="pet@example.com"
              />
            </div>
            {errors.email && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[13px] font-bold">Mật khẩu</label>
              <Link href="/forgot-password" className="text-[12px] font-semibold no-underline" style={{ color: 'var(--primary-600)' }}>Quên mật khẩu?</Link>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
              <input
                {...register('password')}
                type="password"
                className="w-full py-3 pl-[42px] pr-4 rounded-[12px] text-[14px] outline-none transition-colors"
                style={{ border: `1.5px solid ${errors.password ? 'var(--danger)' : 'var(--neutral-200)'}` }}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[52px] rounded-[14px] mt-3 text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
            style={{ background: 'var(--primary-600)' }}
          >
            {isSubmitting ? <><Spinner size={18} /> Đang đăng nhập...</> : <>Đăng nhập <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-[12px] text-neutral-400 font-semibold">HOẶC</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>
        <div className="mt-4">
          <GoogleAuthButton />
        </div>
        <div className="text-center mt-7 text-[14px] text-neutral-500">
          Chưa có tài khoản? <Link href="/register" className="font-bold no-underline" style={{ color: 'var(--primary-600)' }}>Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
