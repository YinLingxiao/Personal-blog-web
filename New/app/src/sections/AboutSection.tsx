import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import AsciiMoon from '@/components/AsciiMoon';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { scrollToSection } from '@/hooks/useSmoothScroll';

const AboutSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const contentRef = useScrollAnimation<HTMLDivElement>({
    animation: 'stagger',
    childSelector: '.about-col',
    stagger: 0.2,
    y: 40,
  });

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    scrollToSection(href);
  };

  return (
    <section
      id="about"
      className="relative"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-16 md:py-24">
        <div ref={headerRef}>
          <SectionHeader number="05" title="About" subtitle="关于墨浅" />
        </div>

        <div
          ref={contentRef}
          className="grid grid-cols-1 md:grid-cols-[30%_1fr] gap-12 md:gap-16"
        >
          <div className="about-col">
            <AsciiMoon
              variant="small"
              className="text-[var(--border)] mb-6"
              style={{ fontSize: '0.5rem' }}
            />
            <span
              className="block text-[0.625rem] uppercase tracking-[0.22em] mb-4"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
            >
              Elsewhere · 别处
            </span>
            <div className="flex flex-col gap-3">
              {[
                { label: 'github', href: 'https://github.com/YinLingxiao' },
                { label: 'bilibili', href: 'https://space.bilibili.com/495914527' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-fit flex items-center gap-2 text-[0.75rem] tracking-[0.05em] transition-colors hover:text-[var(--fg)]"
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

          <div className="about-col">
            <p
              className="text-[0.875rem] leading-[1.8] mb-5"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              这个站是我<strong style={{ color: 'var(--fg)' }}>丢想法</strong>的地方。文章在
              <a href="#ballade" className="about-link" onClick={(e) => handleAnchorClick(e, '#ballade')}>Ballade</a>
              ，此刻在
              <a href="#now" className="about-link" onClick={(e) => handleAnchorClick(e, '#now')}>Now</a>
              ，笔记在
              <a href="#etude" className="about-link" onClick={(e) => handleAnchorClick(e, '#etude')}>Étude</a>
              ，个人与共创项目收在
              <a href="#opus" className="about-link" onClick={(e) => handleAnchorClick(e, '#opus')}>Opus</a>
              。没想清楚的就先丢草稿箱，等它自己发酵。
            </p>

            <p
              className="text-[0.875rem] leading-[1.8] mb-4"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              几件会长期做的事：
            </p>

            <ul className="mb-5">
              {[
                '把复杂的技术问题讲清楚',
                '读书，记一些暂时用不上的笔记',
                '给生活留点空白，别填满',
              ].map((item, i) => (
                <li
                  key={i}
                  className="text-[0.875rem] leading-[1.8] pl-6 relative"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
                >
                  <span className="absolute left-0">-</span>
                  {item}
                </li>
              ))}
            </ul>

            <p
              className="text-[0.875rem] leading-[1.8]"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              不是简历，不是频道。一个角落，随便看看。想聊的话，GitHub 和 B 站都在左边。
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .about-link {
          color: var(--fg);
          border-bottom: 1px dotted var(--fg-dim);
          transition: border-bottom-color 0.3s ease;
        }
        .about-link:hover {
          border-bottom: 1px solid var(--fg);
        }
      `}</style>
    </section>
  );
};

export default AboutSection;
