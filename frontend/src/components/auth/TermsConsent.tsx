"use client";

import Link from "next/link";
import type { UseFormRegisterReturn } from "react-hook-form";

type TermsConsentProps = {
  id: string;
  field: UseFormRegisterReturn;
  error?: string;
};

export default function TermsConsent({ id, field, error }: TermsConsentProps) {
  return (
    <div className="space-y-1.5">
      <div
        className={`flex items-start gap-3 rounded-[12px] border-[1.5px] px-3.5 py-3 transition-colors ${
          error ? "border-danger bg-danger-bg" : "border-neutral-200 bg-neutral-25"
        }`}
      >
        <input
          id={id}
          {...field}
          type="checkbox"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-description`}
          aria-label="Tôi đồng ý với điều khoản mua bán và chính sách bảo mật của ThePawsome"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-[var(--primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100"
        />
        <div id={`${id}-description`} className="text-[12px] leading-5 text-neutral-600">
          <label htmlFor={id} className="cursor-pointer">
            Tôi đồng ý với
          </label>{" "}
          <Link href="/dieu-khoan-mua-ban" className="font-bold no-underline text-primary-600">
            điều khoản mua bán
          </Link>{" "}
          và{" "}
          <Link href="/chinh-sach-bao-mat" className="font-bold no-underline text-primary-600">
            chính sách bảo mật
          </Link>{" "}
          của ThePawsome.
        </div>
      </div>
      {error && (
        <p className="text-[12px] font-semibold" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
