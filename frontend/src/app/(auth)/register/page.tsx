"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import TermsConsent from '@/components/auth/TermsConsent';
import BrandLogo from '@/components/layout/BrandLogo';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const TERMS_ERROR = 'Vui lòng chấp nhận điều khoản và chính sách bảo mật';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  acceptedTerms: z.boolean().refine((accepted) => accepted, { message: TERMS_ERROR }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không trùng khớp",
  path: ["confirmPassword"],
});
type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register, handleSubmit, control, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  });
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const acceptedTerms = useWatch({ control, name: 'acceptedTerms' });

  React.useEffect(() => {
    if (acceptedTerms) clearErrors('acceptedTerms');
  }, [acceptedTerms, clearErrors]);

  const handleBlockedAuth = () => {
    setError('acceptedTerms', { type: 'manual', message: TERMS_ERROR });
    toast.error(TERMS_ERROR);
  };

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
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-10 sm:py-14"
      style={{ background: 'radial-gradient(circle at top right, var(--primary-50), transparent 34%), radial-gradient(circle at bottom left, var(--primary-100), transparent 38%)' }}
    >
      <div className="bg-white/95 border border-neutral-100 rounded-[20px] shadow-lg w-full max-w-[460px] mx-auto p-7 sm:p-9 md:p-10">
        <div className="text-center mb-8">
          <div aria-label="ThePawsome" className="inline-flex items-center justify-center mb-5 text-primary-600">
            <BrandLogo size={64} />
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
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                {...register('fullName')}
                type="text"
                className={`w-full h-[48px] py-3 pl-[42px] pr-4 rounded-[12px] border-[1.5px] bg-white text-[14px] outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 ${errors.fullName ? 'border-danger' : 'border-neutral-200'}`}
                placeholder="Nguyễn Văn A"
              />
            </div>
            {errors.fullName && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-2">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                {...register('email')}
                type="email"
                className={`w-full h-[48px] py-3 pl-[42px] pr-4 rounded-[12px] border-[1.5px] bg-white text-[14px] outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 ${errors.email ? 'border-danger' : 'border-neutral-200'}`}
                placeholder="pet@example.com"
              />
            </div>
            {errors.email && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-2">Mật khẩu</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className={`w-full h-[48px] py-3 pl-[42px] pr-10 rounded-[12px] border-[1.5px] bg-white text-[14px] outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 ${errors.password ? 'border-danger' : 'border-neutral-200'}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-2">Xác nhận mật khẩu</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                className={`w-full h-[48px] py-3 pl-[42px] pr-10 rounded-[12px] border-[1.5px] bg-white text-[14px] outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 ${errors.confirmPassword ? 'border-danger' : 'border-neutral-200'}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-[12px] font-semibold mt-1.5" style={{ color: 'var(--danger)' }}>{errors.confirmPassword.message}</p>}
          </div>
          <TermsConsent
            id="register-terms"
            field={register('acceptedTerms')}
            error={errors.acceptedTerms?.message}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[52px] rounded-[14px] mt-1 text-[15px] font-semibold text-white flex items-center justify-center gap-2 shadow-md transition-all duration-150 hover:shadow-lg disabled:opacity-70"
            style={{ background: 'var(--primary-600)' }}
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
          <GoogleAuthButton label="Đăng ký với Google" canProceed={acceptedTerms} onBlocked={handleBlockedAuth} />
        </div>
        <div className="text-center mt-7 text-[14px] text-neutral-500">
          Đã có tài khoản? <Link href="/login" className="font-bold no-underline" style={{ color: 'var(--primary-600)' }}>Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}
