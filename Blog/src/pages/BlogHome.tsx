import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { usePosts } from '@/hooks/usePosts';
import BlogBrandHome from '@/components/BlogBrandHome';
import { siteConfig } from '@/config';
import type { Post } from '@/types';

function formatDate(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
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

/** 无封面时的排版占位：大号编号 + 标题首字，替代灰底占位图。 */
function CoverArea({ post, index, featured }: { post: Post; index: number; featured?: boolean }) {
  if (post.cover) {
    return (
      <div className={`post-card__cover ${featured ? 'post-card__cover--featured' : ''}`}>
        <img src={post.cover} alt="" loading="lazy" decoding="async" />
        <span className="post-card__veil" aria-hidden />
      </div>
    );
  }
  return (
    <div
      className={`post-card__cover post-card__cover--type ${featured ? 'post-card__cover--featured' : ''}`}
      aria-hidden
    >
      <span className="post-card__type-num">{String(index + 1).padStart(2, '0')}</span>
      <span className="post-card__type-glyph">{post.title.trim().charAt(0)}</span>
    </div>
  );
}

function PostCard({ post, index, featured }: { post: Post; index: number; featured?: boolean }) {
  const summary = post.summary || stripMarkdown(post.content).slice(0, 160);
  return (
    <Link to={`/post/${post.id}`} className={`post-card ${featured ? 'post-card--featured' : ''} no-underline`}>
      <CoverArea post={post} index={index} featured={featured} />
      <div className="post-card__body">
        <div
          className="flex items-center gap-3 text-[0.625rem] tracking-[0.14em] uppercase text-[#404040]"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {post.category && <span className="post-card__pill">{post.category}</span>}
          <time dateTime={new Date(post.updatedAt).toISOString()}>{formatDate(post.updatedAt)}</time>
        </div>
        <h2
          className={`post-card__title font-serif-cn font-bold tracking-[0.01em] ${
            featured ? 'text-[1.4rem] md:text-[1.75rem] leading-[1.45]' : 'text-[1.05rem] md:text-[1.15rem] leading-[1.5]'
          }`}
        >
          {post.title}
        </h2>
        {summary && (
          <p
            className={`font-serif-cn text-[0.8125rem] leading-[1.8] text-[#8c8c8c] ${
              featured ? 'line-clamp-3' : 'line-clamp-2'
            }`}
          >
            {summary}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function BlogHome() {
  const { posts } = usePosts();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    document.title = siteConfig.title;
    document.documentElement.lang = siteConfig.language;
  }, []);

  const categories = useMemo(
    () =>
      [...new Set(posts.map((post) => post.category).filter((category): category is string => Boolean(category)))].sort(),
    [posts],
  );

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

  // 过滤/搜索状态下不再突出"最新一篇"，全部等大卡片，避免结果排序被大卡误导。
  const featured = !filtering && filtered.length > 1 ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  return (
    <div className="blog-grid min-h-screen text-[#e5e5e5]">
      <header className="border-b border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <BlogBrandHome />
          <nav className="flex items-center gap-6 text-[0.75rem] tracking-[0.05em] text-[#8c8c8c]">
            <span className="text-[#e5e5e5]">博客首页</span>
          </nav>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 md:px-8 pb-28">
        {/* Section header — mirrors Home's SectionHeader */}
        <div className="fade-up pt-14 md:pt-20 pb-10 md:pb-12">
          <div
            className="flex items-center gap-4 text-[0.625rem] uppercase tracking-[0.28em] text-[#404040]"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            <span>02</span>
            <span className="w-8 h-px bg-[#1a1a1a]" />
            <span>文章 · Essays &amp; Writings</span>
          </div>
          <h1 className="font-display text-[clamp(2.75rem,7vw,4.5rem)] leading-none mt-5 text-[#e5e5e5]">
            Ballade
          </h1>
          <p className="text-[0.75rem] tracking-[0.12em] mt-5 text-[#555]" style={{ fontFamily: 'var(--font-sans)' }}>
            {filtering ? `${filtered.length} / ${posts.length} 篇` : `共 ${posts.length} 篇`} · 按时间倒序
          </p>
        </div>

        {/* Command-line search */}
        <div className="fade-up max-w-[560px]" style={{ animationDelay: '0.1s' }}>
          <label className="flex items-baseline gap-3 pb-2 border-b border-[#1a1a1a] focus-within:border-[#404040] transition-colors">
            <span className="text-[#404040]" style={{ fontFamily: 'var(--font-sans)' }}>&gt;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题、正文或标签"
              aria-label="搜索文章"
              className="flex-1 bg-transparent text-[0.875rem] tracking-[0.04em] text-[#e5e5e5] placeholder:text-[#404040] focus:outline-none"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
          </label>

          {categories.length > 0 && (
            <div
              className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-[0.7rem] tracking-[0.14em]"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {[
                { key: null as string | null, label: '全部' },
                ...categories.map((cat) => ({ key: cat as string | null, label: cat })),
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => setSelectedCategory(item.key)}
                  aria-pressed={selectedCategory === item.key}
                  className={`pb-1 border-b transition-colors ${
                    selectedCategory === item.key
                      ? 'text-[#e5e5e5] border-[#e5e5e5]'
                      : 'text-[#555] border-transparent hover:text-[#8c8c8c]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editorial numbered list — mirrors Home's Ballade section */}
        {filtered.length === 0 ? (
          <div className="fade-up text-center py-20" style={{ animationDelay: '0.2s' }}>
            <span
              className="block text-[0.625rem] uppercase tracking-[0.22em] mb-3 text-[#404040]"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Intermission · 幕间
            </span>
            <p className="font-serif-cn text-[0.95rem] text-[#8c8c8c]">没有找到匹配的文章。</p>
          </div>
        ) : (
          <div className="mt-10 md:mt-12">
            {featured && (
              <div className="fade-up" style={{ animationDelay: '0.15s' }}>
                <PostCard post={featured} index={0} featured />
              </div>
            )}
            {rest.length > 0 && (
              <div
                className={`mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 ${
                  rest.length > 2 ? 'lg:grid-cols-3' : ''
                }`}
              >
                {rest.map((post, index) => (
                  <div
                    key={post.id}
                    className="fade-up"
                    style={{ animationDelay: `${0.2 + Math.min(index, 12) * 0.05}s` }}
                  >
                    <PostCard post={post} index={featured ? index + 1 : index} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Chopin Ballade No.1 — same fragment as Home's Ballade section */}
      <div className="score-corner" aria-hidden="true">
        <img src="/blog/scores/ballade-a-staff.webp" alt="" loading="lazy" decoding="async" />
        <img src="/blog/scores/ballade-a-notes.webp" alt="" loading="lazy" decoding="async" />
      </div>

      <footer className="border-t border-[#1a1a1a]">
        <div
          className="max-w-[1200px] mx-auto px-6 md:px-8 py-6 flex justify-between items-center text-[0.625rem] tracking-[0.08em] text-[#404040]"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <span>Moqian · Ballade</span>
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
