import MotionControls from '@/components/motion/MotionControls';
import React from 'react';
import BrandSignature from '@/components/BrandSignature';
import BrandMark from '@/components/brand/BrandMark';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const FooterSection: React.FC = () => {
  const quoteRef = useScrollAnimation<HTMLDivElement>({ animation: 'blurReveal' });

  return (
    <footer id="coda"
      className="relative"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {/* Quote */}
      <div
        ref={quoteRef}
        className="text-center pt-24 md:pt-32 pb-8 md:pb-10 px-6"
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
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 pt-4 pb-12">
        <div className="flex flex-col items-center gap-8 md:gap-10">
          {/* Logo */}
          <div data-brand-lockup className="flex flex-col items-center text-center" style={{ color: 'var(--fg)' }}>
            <BrandMark className="h-[96px] md:h-[120px] mb-3 md:mb-4" />
            <BrandSignature entranceDelay={420} className="w-[160px] md:w-[200px] max-w-full h-auto" />
            <p
              className="mt-2 text-[0.75rem] md:text-[0.875rem] italic tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--fg-muted)' }}
            >
              Always rise to the top
            </p>
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

        <div className="text-center mt-10"><MotionControls /></div>
        <div className="text-center mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p
            className="text-[0.625rem] tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
          >
            © {new Date().getFullYear()} Mo Qian. The Art of Less.
          </p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-[0.625rem] tracking-[0.08em] transition-colors hover:text-[var(--fg)]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
          >
            京ICP备2026027832号
          </a>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
