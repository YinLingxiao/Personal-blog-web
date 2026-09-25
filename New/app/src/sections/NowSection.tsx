import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import QuoteTyper from '@/components/QuoteTyper';
import NameReveal from '@/components/NameReveal';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const NowSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const cardRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp', delay: 0.15 });
  const quoteRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp', delay: 0.3 });

  return (
    <section
      id="now"
      className="relative py-20 md:py-28"
      style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8">
        <div ref={headerRef}>
          <SectionHeader number="01" title="Now" subtitle="Who I am" />
        </div>

        <div ref={cardRef} className="now-editorial">
          <img
            src="/portrait.jpg"
            alt="Y.I.A. 的头像"
            width={1105}
            height={1125}
            className="now-portrait object-cover"
            style={{ border: '1px solid var(--border-hover)' }}
          />
          <div className="mt-6 md:mt-8">
            <NameReveal />
          </div>
          <div className="mt-8 max-w-[560px]">
            <p
              className="text-[1.0625rem] leading-[2] tracking-[0.02em]"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
            >
              <span
                className="text-[1.25rem] mr-2"
                style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
              >
                Hi there!
              </span>
              我是Lingxiao，北京邮电大学计算机方向在读。
            </p>
            <p
              className="text-[1rem] leading-[2] mt-5"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              我目前专注于人工智能、软件工程以及计算机科学的学习，希望通过所学创造更多可能性。目前正在探索算法、系统开发以及AI工程实践，并持续探索前沿技术和工程落地之间的连接。
            </p>
            <p
              className="text-[1rem] leading-[2] mt-5"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              我的爱好比较广泛，音乐、书法、美学设计等等。欢迎大家随时与我交流！
            </p>
          </div>

          <dl
            className="mt-10 w-full max-w-[560px] text-left"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {[
              { term: 'Ballade', gloss: '成篇的文章与随笔' },
              { term: 'Étude', gloss: '课程笔记与推导练习' },
              { term: 'Opus', gloss: '独自与协作完成的项目' },
            ].map((entry) => (
              <div
                key={entry.term}
                className="flex items-baseline gap-4 py-[0.7rem]"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <dt
                  className="w-[5.5rem] shrink-0 text-[0.625rem] uppercase tracking-[0.18em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
                >
                  {entry.term}
                </dt>
                <dd
                  className="text-[0.9375rem] leading-[1.7]"
                  style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
                >
                  {entry.gloss}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div ref={quoteRef} className="mt-10">
          <QuoteTyper />
        </div>
      </div>
    </section>
  );
};

export default NowSection;
