import React from 'react';
import SectionHeader from '@/components/SectionHeader';
import ScoreSilhouette from '@/components/ScoreSilhouette';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const EtudeSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const contentRef = useScrollAnimation<HTMLAnchorElement>({ animation: 'slowRise' });
  const noteUrl = import.meta.env.DEV ? 'http://localhost:3001/' : 'https://note.moqian.me/';

  return (
    <section id="etude" className="relative">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-16 md:py-24">
        <div ref={headerRef}>
          <SectionHeader number="04" title="Étude" subtitle="笔记 · Notes & Studies" />
        </div>

        <a
          ref={contentRef}
          href={noteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="score-host group relative overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-end p-8 md:p-12 rounded transition-all duration-400 hover:-translate-y-[2px]"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
        >
          <ScoreSilhouette piece="etude" variant="wide" />
          <div className="max-w-[680px]">
            <span
              className="text-[0.625rem] uppercase tracking-[0.2em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
            >
              Knowledge garden · note.moqian.me
            </span>
            <h3
              className="text-[1.5rem] md:text-[2rem] mt-4 mb-4"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
            >
              在练习里理解，在笔记里留下路径。
            </h3>
            <p
              className="text-[0.875rem] leading-[1.8]"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              课程笔记、公式推导与尚未成篇的思考，在知识图谱中彼此连接。它们不是最终答案，而是持续练习的痕迹。
            </p>
          </div>

          <span
            className="inline-flex items-center gap-3 text-[0.75rem] tracking-[0.12em] uppercase transition-transform duration-300 group-hover:translate-x-1"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}
          >
            进入笔记
            <span>↗</span>
          </span>
        </a>
      </div>
    </section>
  );
};

export default EtudeSection;
