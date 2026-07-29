import React from 'react';
import BrandSignature from '@/components/BrandSignature';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const FooterSection: React.FC = () => {
  const quoteRef = useScrollAnimation<HTMLDivElement>({ animation: 'blurReveal' });

  return (
    <footer
      className="relative"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {/* Quote */}
      <div
        ref={quoteRef}
        className="text-center py-16 px-6"
      >
        <span
          className="text-[0.625rem] uppercase tracking-[0.28em] mb-4 block"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
        >
          Coda · 尾声
        </span>
        <p
          className="text-[1.125rem] tracking-[0.1em]"
          style={{ fontFamily: 'var(--font-literary)', color: 'var(--fg)' }}
        >
          静水深流
        </p>
        <span
          className="text-[0.625rem] mt-2 block tracking-[0.05em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
        >
          WORK SLOW, THINK DEEP
        </span>
      </div>

      {/* Main footer */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3" style={{ color: 'var(--fg-muted)' }}>
            <BrandSignature className="h-[1.7rem] w-auto" />
            <span className="w-[1px] h-4" style={{ backgroundColor: 'var(--border)' }} />
            <span
              className="text-[0.625rem] mt-[1px]"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-dim)' }}
            >
              墨浅
            </span>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-8">
            {[
              { label: 'github', href: 'https://github.com/YinLingxiao' },
              { label: 'bilibili', href: 'https://space.bilibili.com/495914527' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1 text-[0.75rem] tracking-[0.05em] transition-colors hover:text-[var(--fg)]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
              >
                {link.label}
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p
            className="text-[0.625rem] tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
          >
            © 2026 Mo Qian. The Art of Less.
          </p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-[0.625rem] tracking-[0.08em] transition-colors hover:text-[var(--fg-muted)]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
          >
            京ICP备2026027832号
          </a>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
