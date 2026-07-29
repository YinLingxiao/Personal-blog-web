import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import ScoreSilhouette from '@/components/ScoreSilhouette';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface LatestPost {
  title: string;
  url: string;
  dateISO: string;
  dateLabel: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
}

const WritingsSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const listRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp', delay: 0.2 });
  const btnRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp', delay: 0.3 });

  const [posts, setPosts] = useState<LatestPost[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/blog/latest.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: LatestPost[]) => {
        if (!cancelled) setPosts(data.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="ballade" className="score-host relative overflow-hidden">
      <ScoreSilhouette piece="ballade" variant="section" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-8 py-16 md:py-24">
        <div ref={headerRef}>
          <SectionHeader number="02" title="Ballade" subtitle="文章 · Essays & Writings" />
        </div>

        <div ref={listRef} className="max-w-[920px] mx-auto">
          {posts === null && !errored && (
            <div
              className="text-center py-12 px-8 rounded"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <span
                className="block text-[0.625rem] uppercase tracking-[0.22em] mb-3"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
              >
                Intermission · 幕间
              </span>
              <p
                className="text-[0.875rem]"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
              >
                文章正在后台调音，稍候登场。
              </p>
            </div>
          )}

          {errored && (
            <div
              className="text-center py-12 px-8 rounded"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <span
                className="block text-[0.625rem] uppercase tracking-[0.22em] mb-3"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
              >
                Intermission · 幕间
              </span>
              <h3
                className="text-[1.25rem] font-bold tracking-[0.02em] mb-2"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
              >
                这一曲暂未登场
              </h3>
              <p
                className="text-[0.875rem]"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
              >
                博客服务可能还没就位，请过一会儿再来。
              </p>
            </div>
          )}

          {posts && posts.length === 0 && (
            <div
              className="text-center py-12 px-8 rounded"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <span
                className="block text-[0.625rem] uppercase tracking-[0.22em] mb-3"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
              >
                Intermission · 幕间
              </span>
              <p
                className="text-[0.875rem]"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
              >
                节目单暂时留白，新曲正在酝酿。
              </p>
            </div>
          )}

          {posts && posts.length > 0 && (
            <ul style={{ borderTop: '1px solid var(--border)' }}>
              {posts.map((p, index) => (
                <li key={p.url}>
                  <a
                    href={p.url}
                    className="group grid grid-cols-[3rem_1fr] md:grid-cols-[4rem_1fr_auto] gap-x-4 md:gap-x-8 gap-y-3 py-7 md:py-8 no-underline transition-colors duration-300"
                    style={{
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span
                      className="row-span-2 text-[0.625rem] tracking-[0.16em] pt-1"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div
                      className="flex items-center gap-3 text-[0.625rem] tracking-[0.12em] uppercase md:col-start-3 md:row-start-1 md:justify-self-end"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
                    >
                      <time dateTime={p.dateISO}>{p.dateLabel}</time>
                      {p.category && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{p.category}</span>
                        </>
                      )}
                    </div>
                    <h3
                      className="text-[1.25rem] md:text-[1.5rem] font-bold tracking-[0.01em] transition-transform duration-300 group-hover:translate-x-1 md:col-start-2 md:row-start-1"
                      style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
                    >
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p
                        className="text-[0.875rem] leading-[1.8] md:col-start-2 md:row-start-2 max-w-[640px]"
                        style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
                      >
                        {p.excerpt}
                      </p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div ref={btnRef} className="text-center mt-12">
          <a
            href="/blog/"
            className="group inline-flex items-center gap-2 text-[0.75rem] tracking-[0.05em] transition-colors hover:text-[var(--fg)]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
          >
            进入全部文章
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default WritingsSection;
