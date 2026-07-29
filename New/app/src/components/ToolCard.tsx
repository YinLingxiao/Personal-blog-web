import React from 'react';

interface ToolCardProps {
  title: string;
  desc: string;
  href: string;
  external?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, desc, href, external = true }) => {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="group flex items-center justify-between gap-4 p-6 rounded no-underline transition-all duration-400 hover:-translate-y-[2px]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      <div className="flex flex-col gap-2 min-w-0">
        <span
          className="text-[1rem] tracking-[0.02em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}
        >
          {title}
        </span>
        <span
          className="text-[0.75rem]"
          style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
        >
          {desc}
        </span>
      </div>

      <span
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border text-[var(--fg-dim)] transition-all duration-300 group-hover:text-[var(--fg-muted)] group-hover:border-[var(--fg-dim)]"
        style={{ borderColor: 'var(--border)' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="transition-transform duration-300 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
        >
          <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      </span>
    </a>
  );
};

export default React.memo(ToolCard);
