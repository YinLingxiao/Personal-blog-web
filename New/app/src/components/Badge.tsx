import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, className = '' }) => {
  return (
    <span
      className={`inline-block px-4 py-[6px] text-[0.625rem] tracking-[0.08em] rounded border ${className}`}
      style={{
        fontFamily: 'var(--font-mono)',
        color: 'var(--fg-muted)',
        borderColor: 'var(--border)',
      }}
    >
      {children}
    </span>
  );
};

export default React.memo(Badge);
