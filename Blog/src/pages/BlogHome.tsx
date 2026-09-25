import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { usePosts } from '@/hooks/usePosts';
import BlogBrandHome from '@/components/BlogBrandHome';
import AuthMenu from '@/components/AuthMenu';
import { siteConfig, headerConfig } from '@/config';
import type { Post } from '@/types';

function formatDate(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function stripMarkdown(raw: string) {
  return raw
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[[^\]]*\]\([^)]+\)/g, (m) => m.replace(/\[|\]|\([^)]+\)/g, ''))
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

/** 双色题名：冒号前主标亮、冒号及副标压灰，复刻 comp 的开场条目处理。 */
function TwoToneTitle({ title, className }: { title: string; className?: string }) {
  const m = title.match(/[：:]/);
  if (!m || m.index === undefined) {
    return <h2 className={className}>{title}</h2>;
  }
  return (
    <h2 className={className}>
      {title.slice(0, m.index)}
      <span className="entry__title-sub">{title.slice(m.index)}</span>
    </h2>
  );
}

function Entry({ post, index, featured }: { post: Post; index: number; featured?: boolean }) {
  const summary = post.summary || stripMarkdown(post.content).slice(0, 160);
  const num = (
    <span className="entry__num" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
  );
  const date = (
    <time dateTime={new Date(post.updatedAt).toISOString()}>{formatDate(post.updatedAt)}</time>
  );

  if (featured) {
    return (
      <Link to={`/post/${post.id}`} className="entry entry--featured no-underline">
        <TwoToneTitle title={post.title} className="entry__title font-serif-cn" />
        <div className="entry__meta">
          {num}
          {date}
          {post.category && <span className="entry__cat">{post.category}</span>}
        </div>
        {summary && (
          <p className="entry__summary font-serif-cn line-clamp-3">{summary}</p>
        )}
      </Link>
    );
  }

  return (
    <Link to={`/post/${post.id}`} className="entry no-underline">
      <div className="entry__row">
        {num}
        <h2 className="entry__title font-serif-cn">{post.title}</h2>
        <span className="entry__spacer" aria-hidden />
        <div className="entry__meta">
          {post.category && <span className="entry__cat">{post.category}</span>}
          {date}
        </div>
      </div>
    </Link>
  );
}

export default function BlogHome() {
  const { posts } = usePosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  // 从 URL 读取初始分类，让 Home 的「按分类」入口（/blog/?category=技术）能直接落到筛选结果上。
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => searchParams.get('category'));

  function applyCategory(category: string | null) {
    setSelectedCategory(category);
    setSearchParams(category ? { category } : {}, { replace: true });
  }

  useEffect(() => {
    document.title = siteConfig.title;
    document.documentElement.lang = siteConfig.language;
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      if (post.category) map.set(post.category, (map.get(post.category) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (selectedCategory) {
      list = list.filter((post) => post.category === selectedCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (post) =>
          post.title.toLowerCase().includes(q) ||
          post.content.toLowerCase().includes(q) ||
          post.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [posts, search, selectedCategory]);

  const filtering = Boolean(selectedCategory || search.trim());

  // 过滤/搜索状态下不再突出"最新一篇"，全部等大条目，避免结果排序被大条目误导。
  const featured = !filtering && filtered.length > 1 ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  return (
    <div className="blog-grid min-h-screen text-[#e5e5e5]">
      <header className="border-b border-[#1a1a1a]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <BlogBrandHome />
          <nav className="flex items-center gap-5 text-[0.75rem] tracking-[0.05em] text-[#8c8c8c]">
            <a href={headerConfig.noteUrl} className="inline-flex min-h-[44px] items-center hover:text-[#e5e5e5] transition-colors">
              笔记
            </a>
            <span className="text-[#e5e5e5]" aria-current="page">博客首页</span>
            <AuthMenu />
          </nav>
        </div>
      </header>

      <main className="spread max-w-[1440px] mx-auto w-full px-6 md:px-10">
        {/* 左页 · 封面页 */}
        <aside className="spread__left">
          <div className="spread__brandline" aria-hidden>墨浅 · MOQIAN</div>
          <h1 className="spread__title">Ballade</h1>
          <div className="spread__series" aria-hidden>Collection · 文集</div>
          <p className="spread__count">
            {filtering ? `筛出 ${filtered.length} / ${posts.length} 篇` : `共 ${posts.length} 篇 · 文章`}
          </p>

          {categories.length > 0 && (
            <nav className="spread__cats" aria-label="按分类筛选">
              <button
                className="cat-row"
                aria-pressed={selectedCategory === null}
                onClick={() => applyCategory(null)}
              >
                <span className="cat-row__name">全部</span>
                <span className="cat-row__leader" aria-hidden />
                <span className="cat-row__count">{posts.length} 篇</span>
              </button>
              {categories.map(([cat, count]) => (
                <button
                  key={cat}
                  className="cat-row"
                  aria-pressed={selectedCategory === cat}
                  onClick={() => applyCategory(selectedCategory === cat ? null : cat)}
                >
                  <span className="cat-row__name">{cat}</span>
                  <span className="cat-row__leader" aria-hidden />
                  <span className="cat-row__count">{count} 篇</span>
                </button>
              ))}
            </nav>
          )}

          <figure className="spread__score" aria-hidden="true">
            <div className="spread__score-fig">
              <img src="/blog/scores/ballade-a-staff.webp" alt="" loading="lazy" decoding="async" />
              <img src="/blog/scores/ballade-a-notes.webp" alt="" loading="lazy" decoding="async" />
            </div>
            <figcaption className="spread__score-cap">
              肖邦《叙事曲》— 曲目手稿剪影
            </figcaption>
          </figure>
        </aside>

        {/* 右页 · 条目流 */}
        <section className="spread__right">
          <div className="spread__tools">
            <label className="spread__search">
              <span aria-hidden>&gt;</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="检索标题、正文或标签"
                aria-label="搜索文章"
              />
            </label>
            <span className="spread__order" aria-hidden>按时间倒序</span>
          </div>

          {filtered.length === 0 ? (
            <div className="fade-up text-center py-24">
              <span className="block text-[0.625rem] uppercase tracking-[0.22em] mb-3 text-[#404040]">
                Intermission · 幕间
              </span>
              <p className="font-serif-cn text-[0.95rem] text-[#8c8c8c]">没有找到匹配的文章。</p>
            </div>
          ) : (
            <div>
              {featured && (
                <div className="fade-up" style={{ animationDelay: '0.1s' }}>
                  <Entry post={featured} index={0} featured />
                </div>
              )}
              {rest.map((post, index) => (
                <div
                  key={post.id}
                  className="fade-up"
                  style={{ animationDelay: `${0.18 + Math.min(index, 12) * 0.05}s` }}
                >
                  <Entry post={post} index={featured ? index + 1 : index} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-[#1a1a1a]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-6 flex justify-between items-center text-[0.625rem] tracking-[0.08em] text-[#404040]">
          <span className="flex items-center gap-4">
            <span>Moqian · Ballade</span>
            <a href="/blog/rss.xml" className="hover:text-[#8c8c8c] transition-colors">RSS</a>
          </span>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#8c8c8c] transition-colors"
          >
            京ICP备2026027832号
          </a>
        </div>
      </footer>
    </div>
  );
}
