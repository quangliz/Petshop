"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Mail, Lock, Sparkles, User, ArrowRight } from 'lucide-react';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });
  const [serverError, setServerError] = useState('');
  const router = useRouter();

  const onSubmit = async (data: RegisterForm) => {
    setServerError('');
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        full_name: data.fullName,
      });
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push('/login');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string | { msg: string }[] } } };
      const detail = axiosErr.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (typeof detail === 'string' ? detail : 'Đăng ký thất bại');
      setServerError(msg);
      toast.error(msg);
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

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {serverError && <div style={{ padding: '12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{serverError}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Họ và tên</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--neutral-400)' }} />
              <input 
                {...register('fullName')}
                type="text"
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 12, border: `1.5px solid ${errors.fullName ? 'var(--danger)' : 'var(--neutral-200)'}`, outline: 'none' }}
                placeholder="Nguyễn Văn A"
              />
            </div>
            {errors.fullName && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6, fontWeight: 600 }}>{errors.fullName.message}</p>}
          </div>
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
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Mật khẩu</label>
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
            className="btn btn-teal btn-lg" 
            style={{ width: '100%', height: 52, borderRadius: 14, marginTop: 12, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isSubmitting ? <><Spinner size={18} /> Đang đăng ký...</> : (
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
