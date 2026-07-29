import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import QuoteTyper from '@/components/QuoteTyper';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const NowSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const cardRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp', delay: 0.15 });
  const quoteRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp', delay: 0.3 });

  return (
    <section
      id="now"
      className="relative"
      style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-16 md:py-24">
        <div ref={headerRef}>
          <SectionHeader number="01" title="Now" subtitle="此刻 · Who I am" />
        </div>

        <div
          ref={cardRef}
          className="rounded p-8 md:p-12"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p
            className="text-[1rem] leading-[2] tracking-[0.02em]"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
          >
            <span
              className="text-[1.35rem] mr-2"
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            >
              Hi there!
            </span>
            我是Lingxiao，北京邮电大学计算机方向在读。
          </p>
          <p
            className="text-[0.875rem] leading-[1.9] mt-4"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
          >
            我目前专注于人工智能、软件工程以及计算机科学的学习，希望通过所学创造更多可能性。目前正在探索算法、系统开发以及AI工程实践，并持续探索前沿技术和工程落地之间的连接。
          </p>
          <p
            className="text-[0.875rem] leading-[1.9] mt-4"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
          >
            我的爱好比较广泛，音乐、书法、美学设计等等。欢迎大家随时与我交流！
          </p>
        </div>

        <div ref={quoteRef} className="mt-6">
          <QuoteTyper />
        </div>
      </div>
    </section>
  );
};

export default NowSection;
