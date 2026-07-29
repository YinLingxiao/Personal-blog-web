import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import ScoreSilhouette from '@/components/ScoreSilhouette';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const OpusSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const gridRef = useScrollAnimation<HTMLDivElement>({
    animation: 'stagger',
    childSelector: '.opus-card',
    stagger: 0.18,
    y: 36,
  });

  return (
    <section
      id="opus"
      className="score-host relative overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <ScoreSilhouette piece="opus" variant="section" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-8 py-16 md:py-24">
        <div ref={headerRef}>
          <SectionHeader number="03" title="Opus" subtitle="作品 · Selected Works" />
        </div>

        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <article
            className="opus-card score-host group relative overflow-hidden rounded p-8 md:p-10 min-h-[320px] flex flex-col"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <ScoreSilhouette piece="sonata" variant="card" />
            <div className="flex items-start justify-between gap-6">
              <div>
                <span
                  className="text-[0.625rem] uppercase tracking-[0.22em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                >
                  Solo works
                </span>
                <h3
                  className="text-[clamp(2rem,5vw,4rem)] tracking-[-0.04em] mt-3"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                >
                  Sonata
                </h3>
              </div>
              <span
                className="text-[0.625rem] tracking-[0.16em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
              >
                I
              </span>
            </div>

            <p
              className="text-[0.875rem] leading-[1.8] mt-5 max-w-[520px]"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              从一个念头开始，独自完成的产品、工具与长期实验。保留个人判断，也保留不成熟的棱角。
            </p>

            <a
              href="https://video.moqian.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="group/link mt-auto pt-10 flex items-center justify-between gap-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <div className="pt-5">
                <span
                  className="block text-[0.625rem] uppercase tracking-[0.16em] mb-2"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                >
                  Utility · 01
                </span>
                <span
                  className="text-[1rem]"
                  style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
                >
                  视频下载工具
                </span>
              </div>
              <span className="pt-5 text-[var(--fg-dim)] transition-transform duration-300 group-hover/link:translate-x-1 group-hover/link:-translate-y-1">
                ↗
              </span>
            </a>
          </article>

          <article
            className="opus-card score-host relative overflow-hidden rounded p-8 md:p-10 min-h-[320px] flex flex-col"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <ScoreSilhouette piece="concerto" variant="card" />
            <div className="flex items-start justify-between gap-6">
              <div>
                <span
                  className="text-[0.625rem] uppercase tracking-[0.22em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                >
                  Co-created works
                </span>
                <h3
                  className="text-[clamp(2rem,5vw,4rem)] tracking-[-0.04em] mt-3"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
                >
                  Concerto
                </h3>
              </div>
              <span
                className="text-[0.625rem] tracking-[0.16em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
              >
                II
              </span>
            </div>

            <p
              className="text-[0.875rem] leading-[1.8] mt-5"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              与不同的人交换想法、分担工作，让一件作品拥有不止一种声音。
            </p>

            <div className="mt-auto pt-10" style={{ borderTop: '1px solid var(--border)' }}>
              <span
                className="block pt-5 text-[0.625rem] uppercase tracking-[0.16em] mb-2"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
              >
                Intermission
              </span>
              <p
                className="text-[0.875rem] leading-[1.7]"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
              >
                共创席位暂时留白，等待下一次合奏。
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default OpusSection;
