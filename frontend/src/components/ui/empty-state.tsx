import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm px-6 py-16 text-center flex flex-col items-center gap-4">
      <div className="w-[72px] h-[72px] rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-300">
        {icon}
      </div>
      <div>
        <div className="text-[18px] font-bold text-neutral-700 mb-1.5">{title}</div>
        <div className="text-[14px] text-neutral-400 leading-[1.5]">{description}</div>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[12px] bg-[oklch(0.68_0.19_50)] text-white text-[14px] font-semibold hover:bg-[oklch(0.61_0.19_46)] transition-colors duration-150"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
