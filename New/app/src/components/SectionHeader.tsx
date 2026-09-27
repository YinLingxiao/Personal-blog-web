import React from 'react';

interface SectionHeaderProps {
  number: string;
  title: string;
  subtitle: string;
  className?: string;
  titleFont?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ number, title, subtitle, className = '', titleFont = 'var(--font-display)' }) => {
  return (
    <div className={`mb-10 ${className}`}>
      <p
        className="flex items-center gap-3 text-[0.625rem] uppercase tracking-[0.2em] mb-4"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
      >
        <span>{number}</span>
        <span className="w-8 h-px" style={{ backgroundColor: 'var(--border-hover)' }} />
        <span>{subtitle}</span>
      </p>
      <h2
        className="text-[clamp(2rem,4vw,3.5rem)] font-light tracking-[-0.03em] leading-none"
        style={{ fontFamily: titleFont, color: 'var(--fg)' }}
      >
        {title}
      </h2>
    </div>
  );
};

export default React.memo(SectionHeader);
