import React from 'react';

interface TrailCardProps {
  en: string;
  title: string;
  desc: string;
  linkText: string;
  href?: string;
}

const TrailCard: React.FC<TrailCardProps> = ({ en, title, desc, linkText, href = '#' }) => {
  return (
    <a
      href={href}
      className="group flex flex-col gap-3 p-8 rounded no-underline transition-all duration-400 hover:-translate-y-[2px]"
      style={{
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      <span
        className="text-[0.625rem] uppercase tracking-[0.1em]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
      >
        {en}
      </span>

      <h3
        className="text-[1.5rem] font-bold tracking-[0.02em] mt-1"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
      >
        {title}
      </h3>

      <p
        className="text-[0.875rem] leading-[1.8] mt-1"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
      >
        {desc}
      </p>

      <span
        className="flex items-center gap-2 mt-4 text-[0.625rem] tracking-[0.08em] transition-all duration-300 group-hover:text-[var(--fg-muted)]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
      >
        {linkText}
        <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </span>
    </a>
  );
};

export default React.memo(TrailCard);
