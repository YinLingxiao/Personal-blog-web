import KnowledgeConstellation from '@/components/KnowledgeConstellation';
import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import ScoreSilhouette from '@/components/ScoreSilhouette';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface NoteItem {
  id: string;
  title: string;
  kind?: string;
  category?: string;
  tags?: string[];
}

interface NotesDigest {
  total: number;
  categories: { name: string; count: number }[];
  items: NoteItem[];
}

const EtudeSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const contentRef = useScrollAnimation<HTMLDivElement>({ animation: 'slowRise' });
  const listRef = useScrollAnimation<HTMLDivElement>({
    animation: 'stagger',
    childSelector: '.etude-row',
    stagger: 0.09,
    y: 20,
  });
  const noteBase = import.meta.env.DEV ? 'http://localhost:3001' : 'https://note.moqian.me';

  const [active, setActive] = useState<string | null>(null);
  const [digest, setDigest] = useState<NotesDigest | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/notes-latest.json', { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((data: NotesDigest) => {
        if (!cancelled && Array.isArray(data.items) && Array.isArray(data.categories)) setDigest(data); else if (!cancelled) setErrored(true);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = (digest?.items ?? []).slice(0, 5);
  const hasItems = items.length > 0;

  return (
    <section id="etude" className="score-host relative py-20 md:py-28">
      <ScoreSilhouette piece="etude" variant="section" className="etude-score hidden lg:block" />
      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8">
        <div ref={headerRef}>
          <SectionHeader number="04" title="Étude" subtitle="笔记 · Notes & Studies" />
        </div>

        <div ref={contentRef} className="grid lg:grid-cols-[5fr_7fr] gap-10 lg:gap-0">
          <div className="relative lg:pr-12 lg:min-h-[22rem]">
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
              className="text-[1rem] leading-[2] max-w-[34ch]"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
            >
              课程笔记、公式推导与尚未成篇的思考，在知识图谱中彼此连接。它们不是最终答案，而是持续练习的痕迹。
            </p>

            {digest && <KnowledgeConstellation notes={items} categories={digest.categories} base={noteBase} active={active} onActive={setActive} />}
            {digest && digest.categories.length > 0 && (
              <div className="mt-8 max-w-[24rem]">
                <span
                  className="block text-[0.625rem] uppercase tracking-[0.16em] mb-3"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                >
                  Index · 分类
                </span>
                <ul className="flex flex-col">
                  {digest.categories.map((category) => (
                    <li key={category.name} className="flex items-baseline gap-3 py-[0.4rem]">
                      <span
                        className="text-[0.9375rem] shrink-0"
                        style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
                      >
                        {category.name}
                      </span>
                      <span
                        className="flex-1 translate-y-[-0.2em]"
                        style={{ borderBottom: '1px dotted var(--border-hover)' }}
                        aria-hidden
                      />
                      <span
                        className="text-[0.625rem] tracking-[0.12em] shrink-0"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                      >
                        {String(category.count).padStart(2, '0')}
                      </span>
                    </li>
                  ))}
                </ul>
                <p
                  className="mt-3 text-[0.625rem] uppercase tracking-[0.16em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                >
                  {digest.total} notes in the garden
                </p>
              </div>
            )}
          </div>

          <div className="lg:pl-12 lg:border-l lg:border-[var(--border)]">
            <span
              className="block text-[0.625rem] uppercase tracking-[0.16em] mb-4"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
            >
              Recent studies · 最近练习
            </span>

            {!digest && !errored && (
              <p
                className="text-[0.875rem] leading-[1.8]"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
              >
                正在翻开笔记本…
              </p>
            )}

            {(errored || (digest && !hasItems)) && (
              <div className="py-10">
                <span
                  className="block text-[0.625rem] uppercase tracking-[0.22em] mb-3"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                >
                  Intermission · 幕间
                </span>
                <p
                  className="text-[0.875rem] leading-[1.8]"
                  style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
                >
                  这一页练习还没誊清，先去知识花园里逛逛。
                </p>
              </div>
            )}

            {hasItems && (
              <div ref={listRef}>
                <ul style={{ borderTop: '1px solid var(--border)' }}>
                  {items.map((note, index) => (
                    <li key={note.id} className="etude-row" data-active={active === note.id}>
                      <a
                        href={`${noteBase}/post/${encodeURIComponent(note.id)}`}
                        onPointerEnter={() => setActive(note.id)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(note.id)} onBlur={() => setActive(null)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-4 no-underline"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <span
                          className="text-[0.625rem] tracking-[0.16em]"
                          style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0">
                          <span
                            className="block text-[1.0625rem] leading-[1.5] transition-transform duration-300 group-hover:translate-x-1"
                            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
                          >
                            {note.title}
                          </span>
                          {note.tags && note.tags.length > 0 && (
                            <span
                              className="block mt-1 text-[0.625rem] tracking-[0.12em]"
                              style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                            >
                              {note.tags.join(' · ')}
                            </span>
                          )}
                        </span>
                        {note.kind && (
                          <span
                            className="text-[0.625rem] tracking-[0.12em] whitespace-nowrap"
                            style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
                          >
                            {note.kind}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <a
              href={`${noteBase}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 mt-8 text-[0.75rem] tracking-[0.05em] transition-colors hover:text-[var(--fg)]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
            >
              进入笔记
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5">
                ↗
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EtudeSection;
