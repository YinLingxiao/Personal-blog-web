import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import KnowledgeConstellation from '@/components/KnowledgeConstellation';
import SectionHeader from '@/components/SectionHeader';
import ScoreSilhouette from '@/components/ScoreSilhouette';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { authBaseURL } from '@/lib/auth-client';

interface NoteItem { id: string; title: string; kind: string; category: string; tags: string[]; updatedAt: number }
interface NotesCatalog { total: number; categories: { name: string; count: number }[]; items: NoteItem[] }

const noteBase = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3001' : 'https://note.moqian.me';

function isCatalog(value: unknown): value is NotesCatalog {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<NotesCatalog>;
  return Array.isArray(data.categories) && Array.isArray(data.items) && typeof data.total === 'number'
    && data.categories.every(category => category && typeof category.name === 'string' && typeof category.count === 'number')
    && data.items.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.category === 'string' && Array.isArray(item.tags));
}

export default function EtudeSection() {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const contentRef = useScrollAnimation<HTMLDivElement>({ animation: 'slowRise' });
  const listRef = useRef<HTMLUListElement>(null);
  const [catalog, setCatalog] = useState<NotesCatalog | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'fallback' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [listHeight, setListHeight] = useState<number | undefined>();

  useEffect(() => {
    const controller = new AbortController();
    const read = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value: unknown = await response.json();
      if (!isCatalog(value)) throw new Error('Invalid note catalog');
      return value;
    };
    const load = async () => {
      try {
        const value = await read(`${authBaseURL}/api/content/note/catalog.json`);
        if (!controller.signal.aborted) { setCatalog(value); setStatus('live'); }
      } catch {
        if (controller.signal.aborted) return;
        try {
          const value = await read('/notes-catalog.json');
          if (!controller.signal.aborted) { setCatalog(value); setStatus('fallback'); }
        } catch {
          if (!controller.signal.aborted) setStatus('error');
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [retry]);

  const items = useMemo(() => selected ? (catalog?.items ?? []).filter(note => note.category === selected) : catalog?.items ?? [], [catalog, selected]);
  const chooseCategory = (name: string | null) => {
    setSelected(name);
    setActive(null);
    if (listRef.current) listRef.current.scrollTop = 0;
  };
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || items.length <= 7) return;
    const measure = () => {
      const rows = Array.from(list.children).slice(0, 7) as HTMLElement[];
      if (rows.length < 7) return;
      const total = rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0);
      const next = list.children[7] as HTMLElement | undefined;
      const peek = next ? Math.min(26, next.getBoundingClientRect().height * .34) : 0;
      setListHeight(total + peek);
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    Array.from(list.children).slice(0, 8).forEach(child => observer.observe(child));
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [items]);

  return <section id="etude" className="score-host relative py-20 md:py-28">
    <ScoreSilhouette piece="etude" variant="section" className="etude-score hidden lg:block" />
    <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8">
      <div ref={headerRef}><SectionHeader number="03" title="Étude" subtitle="笔记 · Notes & Studies" /></div>
      <div ref={contentRef} className="grid lg:grid-cols-[5fr_7fr] gap-10 lg:gap-0">
        <div className="relative lg:pr-12 lg:min-h-[22rem]">
          <span className="text-[0.6875rem] uppercase tracking-[0.16em]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}>Knowledge garden · note.moqian.me</span>
          <h3 className="text-[1.5rem] md:text-[2rem] mt-4 mb-4" style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}>在练习里理解，在笔记里留下路径。</h3>
          <p className="text-[1rem] leading-[2] max-w-[34ch]" style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}>课程笔记、公式推导与尚未成篇的思考，在知识图谱中彼此连接。它们不是最终答案，而是持续练习的痕迹。</p>
          {catalog && <KnowledgeConstellation notes={items} categories={catalog.categories} selected={selected} base={noteBase} active={active} onCategory={chooseCategory} onActive={setActive} />}
          {catalog && catalog.categories.length > 0 && <div className="mt-8 max-w-[24rem]">
            <span className="block text-[0.6875rem] uppercase tracking-[0.16em] mb-3" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}>Index · 分类</span>
            <ul className="flex flex-col">
              {[{ name: '全部', count: catalog.total }, ...catalog.categories].map(category => {
                const isSelected = category.name === '全部' ? selected === null : selected === category.name;
                return <li key={category.name}>
                  <button type="button" className="etude-category" aria-pressed={isSelected} onClick={() => chooseCategory(category.name === '全部' ? null : category.name)}>
                    <span className="etude-category-name">{category.name}</span><span className="etude-category-rule" aria-hidden="true" />
                    <span className="etude-category-count">{String(category.count).padStart(2, '0')}</span>
                  </button>
                </li>;
              })}
            </ul>
            <p className="mt-3 text-[0.6875rem] uppercase tracking-[0.16em]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}>{catalog.total} notes in the garden</p>
          </div>}
        </div>
        <div className="lg:pl-12 lg:border-l lg:border-[var(--border)]">
          <span className="block text-[0.6875rem] uppercase tracking-[0.16em] mb-4" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}>笔记内容</span>
          {status === 'loading' && <p className="text-[0.875rem] leading-[1.8]" style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}>正在翻开笔记本…</p>}
          {status === 'fallback' && <div className="etude-status" role="status">正在显示本地笔记快照。<button type="button" onClick={() => setRetry(value => value + 1)}>重试更新</button></div>}
          {status === 'error' && <div className="etude-status" role="alert">暂时无法读取笔记目录。<button type="button" onClick={() => setRetry(value => value + 1)}>重试</button></div>}
          {catalog && items.length === 0 && <p className="text-[0.875rem] leading-[1.8]" style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}>这个分类暂时没有公开笔记。</p>}
          {items.length > 0 && <ul ref={listRef} className="etude-list" data-lenis-prevent-wheel style={{ maxHeight: items.length > 7 && listHeight ? `${listHeight}px` : undefined }} aria-label={selected ? `${selected}笔记内容` : '全部笔记内容'}>
            {items.map((note, index) => <li key={note.id} className="etude-row" data-active={active === note.id}>
              <a href={`${noteBase}/post/${encodeURIComponent(note.id)}`} target="_blank" rel="noopener noreferrer" onPointerEnter={() => setActive(note.id)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(note.id)} onBlur={() => setActive(null)} className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-4 no-underline">
                <span className="text-[0.6875rem] tracking-[0.16em]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}>{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0"><span className="block text-[1.0625rem] leading-[1.5] transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}>{note.title}</span>
                  {note.tags.length > 0 && <span className="block mt-1 text-[0.6875rem] tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}>{note.tags.join(' · ')}</span>}
                </span>
                {note.kind && <span className="text-[0.6875rem] tracking-[0.12em] whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{note.kind}</span>}
              </a>
            </li>)}
          </ul>}
          <a href={`${noteBase}/`} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 mt-8 text-[0.75rem] tracking-[0.05em] transition-colors hover:text-[var(--fg)]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>进入笔记 <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5">↗</span></a>
        </div>
      </div>
    </div>
  </section>;
}
