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
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10"
      style={{ background: 'radial-gradient(circle at top right, var(--primary-50), transparent), radial-gradient(circle at bottom left, var(--teal-50), transparent)' }}
    >
      <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm w-full max-w-md mx-auto p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white mx-auto mb-5" style={{ background: 'var(--teal-600)', boxShadow: '0 8px 16px var(--teal-100)' }}>
            <Sparkles size={32} />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.025em] mb-2">Tạo tài khoản</h1>
          <p className="text-[14px] text-neutral-500">Gia nhập cộng đồng ThePawsome ngay hôm nay</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {serverError && (
            <div className="px-3 py-3 rounded-[10px] text-[13px] text-center font-semibold" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {serverError}
            </div>
          )}
          <div>
            <label className="block text-[13px] font-bold mb-2">Họ và tên</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
              <input
                {...register('fullName')}
                type="text"
                className="w-full py-3 pl-[42px] pr-4 rounded-[12px] text-[14px] outline-none"
                style={{ border: `1.5px solid ${errors.fullName ? 'var(--danger)' : 'var(--neutral-200)'}` }}
                placeholder="Nguyễn Văn A"
              />
            </div>
            {errors.fullName && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-2">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
              <input
                {...register('email')}
                type="email"
                className="w-full py-3 pl-[42px] pr-4 rounded-[12px] text-[14px] outline-none"
                style={{ border: `1.5px solid ${errors.email ? 'var(--danger)' : 'var(--neutral-200)'}` }}
                placeholder="pet@example.com"
              />
            </div>
            {errors.email && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-2">Mật khẩu</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-[15px] text-neutral-400" />
              <input
                {...register('password')}
                type="password"
                className="w-full py-3 pl-[42px] pr-4 rounded-[12px] text-[14px] outline-none"
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
            style={{ background: 'var(--teal-600)' }}
          >
            {isSubmitting ? <><Spinner size={18} /> Đang đăng ký...</> : <>Đăng ký tài khoản <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-neutral-200" />
          <span className="text-[12px] text-neutral-400 font-semibold">HOẶC</span>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>
        <div className="mt-4">
          <GoogleAuthButton label="Đăng ký với Google" />
        </div>
        <div className="text-center mt-7 text-[14px] text-neutral-500">
          Đã có tài khoản? <Link href="/login" className="font-bold no-underline" style={{ color: 'var(--primary-600)' }}>Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}
