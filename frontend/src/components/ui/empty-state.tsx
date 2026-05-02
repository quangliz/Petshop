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
    <div className="card px-6 py-16 text-center flex flex-col items-center gap-4">
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--neutral-50)', border: '1px solid var(--neutral-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--neutral-300)'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--neutral-400)', lineHeight: 1.5 }}>{description}</div>
      </div>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-primary" style={{ marginTop: 8 }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
