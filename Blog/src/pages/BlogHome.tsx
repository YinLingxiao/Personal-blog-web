import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Search, X } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import BlogBrandHome from '@/components/BlogBrandHome';
import AuthMenu from '@/components/AuthMenu';
import { siteConfig, headerConfig } from '@/config';
import type { Post } from '@/types';
import './ballade.css';

function formatDate(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function stripMarkdown(raw: string) {
  return raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_m, target: string, _a, alias?: string) => alias || target)
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>)\s*/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerptOf(post: Post, limit: number) {
  return post.summary || stripMarkdown(post.content).slice(0, limit);
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function Title({ title, as: Tag, className }: { title: string; as: 'h2' | 'h3'; className: string }) {
  const m = title.match(/[：:]/);
  if (!m || m.index === undefined || m.index === 0) {
    return <Tag className={className}>{title}</Tag>;
  }
  return (
    <Tag className={className}>
      {title.slice(0, m.index + 1)}
      <span className="bl-title-sub">{title.slice(m.index + 1)}</span>
    </Tag>
  );
}

function PostDate({ ts }: { ts: number }) {
  return <time dateTime={new Date(ts).toISOString().slice(0, 10)}>{formatDate(ts)}</time>;
}

function FeaturedCard({ post, no }: { post: Post; no: number }) {
  const summary = excerptOf(post, 220);
  return (
    <Link to={`/post/${post.id}`} className="bl-feature">
      <div className="bl-feature__body">
        <p className="bl-kicker">
          <span>Latest</span>
          <span className="bl-kicker__rule" aria-hidden="true" />
          <span>最新一篇</span>
        </p>
        <Title title={post.title} as="h3" className="bl-feature__title" />
        {summary && <p className="bl-feature__excerpt">{summary}</p>}
        <span className="bl-read">
          阅读全文<span className="bl-read__arrow" aria-hidden="true">→</span>
        </span>
      </div>
      <div className={post.cover ? 'bl-plate bl-plate--cover' : 'bl-plate'}>
        {post.cover ? (
          <figure className="bl-plate__cover">
            <img src={post.cover} alt="" decoding="async" />
          </figure>
        ) : (
          <span className="bl-plate__no" aria-hidden="true">
            <span className="bl-no">No.</span>{pad(no)}
          </span>
        )}
        <dl className="bl-plate__notes">
          {post.category && (
            <div>
              <dt>分类</dt>
              <dd>{post.category}</dd>
            </div>
          )}
          <div>
            <dt>日期</dt>
            <dd><PostDate ts={post.updatedAt} /></dd>
          </div>
          {post.tags.length > 0 && (
            <div className="bl-plate__tags">
              <dt>标签</dt>
              <dd>{post.tags.join(' · ')}</dd>
            </div>
          )}
        </dl>
      </div>
    </Link>
  );
}

function PostCard({ post, no, order }: { post: Post; no: number; order: number }) {
  const summary = excerptOf(post, 140);
  return (
    <li className="bl-cell" style={{ '--bl-delay': `${Math.min(order, 5) * 45}ms` } as CSSProperties}>
      <Link to={`/post/${post.id}`} className={post.cover ? 'bl-card bl-card--cover' : 'bl-card'}>
        {post.cover && (
          <figure className="bl-card__cover">
            <img src={post.cover} alt="" loading="lazy" decoding="async" />
          </figure>
        )}
        <div className="bl-card__inner">
          <Title title={post.title} as="h3" className="bl-card__title" />
          <p className="bl-card__meta">
            <span className="bl-card__cat">{post.category || '未分类'}</span>
            <PostDate ts={post.updatedAt} />
          </p>
          {summary && <p className="bl-card__excerpt">{summary}</p>}
          <span className="bl-card__foot">
            <span className="bl-card__no" aria-hidden="true"><span className="bl-no">No.</span>{pad(no)}</span>
            <span className="bl-read">
              阅读<span className="bl-read__arrow" aria-hidden="true">→</span>
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function BlogHome() {
  const { posts } = usePosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  // 从 URL 读取初始分类，让 Home 的「按分类」入口（/blog/?category=技术）能直接落到筛选结果上。
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => searchParams.get('category'));
  const searchId = useId();

  function applyCategory(category: string | null) {
    setSelectedCategory(category);
    setSearchParams(category ? { category } : {}, { replace: true });
  }

  function clearFilters() {
    setSearch('');
    applyCategory(null);
  }

  useEffect(() => {
    document.title = siteConfig.title;
    document.documentElement.lang = siteConfig.language;
  }, []);

  const sorted = useMemo(() => [...posts].sort((a, b) => b.updatedAt - a.updatedAt), [posts]);
  const numbers = useMemo(() => new Map(sorted.map((post, i) => [post.id, sorted.length - i])), [sorted]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      if (post.category) map.set(post.category, (map.get(post.category) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [posts]);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = sorted;
    if (selectedCategory) {
      list = list.filter((post) => post.category === selectedCategory);
    }
    if (query) {
      list = list.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }
    return list;
  }, [sorted, query, selectedCategory]);

  const filtering = Boolean(selectedCategory || query);
  const featured = !filtering && filtered.length > 0 ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;
  const latest = sorted[0];

  let status = `共 ${posts.length} 篇`;
  if (filtering) {
    const scope = [selectedCategory && `「${selectedCategory}」`, query && `“${search.trim()}”`].filter(Boolean).join(' · ');
    status = `${scope} · ${filtered.length} / ${posts.length} 篇`;
  }

  return (
    <div className="ballade blog-grid min-h-screen">
      <header className="bl-topbar">
        <div className="bl-wrap bl-topbar__inner">
          <BlogBrandHome />
          <nav className="bl-nav" aria-label="站点导航">
            <a href={headerConfig.noteUrl}>笔记</a>
            <span aria-current="page">博客首页</span>
            <AuthMenu />
          </nav>
        </div>
      </header>

      <main className="bl-wrap bl-main">
        <section className="bl-masthead" aria-labelledby="bl-title">
          <div className="bl-masthead__lead">
            <p className="bl-kicker">
              <span>墨浅 · Moqian</span>
              <span className="bl-kicker__rule" aria-hidden="true" />
              <span lang="en">Essays &amp; Writings</span>
            </p>
            <h1 id="bl-title" className="bl-masthead__title" lang="en">
              Ballade<span className="sr-only" lang="zh-CN"> · 墨浅博文</span>
            </h1>
            <p className="bl-masthead__intro">{siteConfig.description}</p>
          </div>
          <dl className="bl-programme">
            <div>
              <dt>篇目 <span lang="en">Essays</span></dt>
              <dd className="bl-programme__figure">{pad(posts.length)}</dd>
            </div>
            <div>
              <dt>分类 <span lang="en">Sections</span></dt>
              <dd className="bl-programme__figure">{pad(categories.length)}</dd>
            </div>
            <div>
              <dt>最近 <span lang="en">Latest</span></dt>
              <dd>{latest ? <PostDate ts={latest.updatedAt} /> : '—'}</dd>
            </div>
          </dl>
          <div className="bl-staff" aria-hidden="true" />
        </section>

        {posts.length > 0 && (
          <section className="bl-toolbar" aria-labelledby="bl-index">
            <div className="bl-toolbar__head">
              <h2 id="bl-index" className="bl-toolbar__title">
                文章目录<span lang="en">Index</span>
              </h2>
              <p className="bl-toolbar__status" aria-live="polite">
                <span>{status}</span>
                <span className="bl-toolbar__order">按时间倒序</span>
              </p>
            </div>
            <div className="bl-toolbar__controls">
              <div className="bl-search">
                <label htmlFor={searchId} className="bl-search__label">检索</label>
                <div className="bl-search__field">
                  <Search className="bl-search__icon" aria-hidden="true" />
                  <input
                    id={searchId}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && search) {
                        e.preventDefault();
                        setSearch('');
                      }
                    }}
                    placeholder="标题、正文或标签"
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  {search && (
                    <button type="button" className="bl-search__clear" onClick={() => setSearch('')} aria-label="清空检索">
                      <X aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              {categories.length > 0 && (
                <div className="bl-cats" role="group" aria-label="按分类筛选">
                  <button type="button" className="bl-cat" aria-pressed={selectedCategory === null} onClick={() => applyCategory(null)}>
                    全部<span className="bl-cat__count">{posts.length}</span>
                  </button>
                  {categories.map(([cat, count]) => (
                    <button
                      key={cat}
                      type="button"
                      className="bl-cat"
                      aria-pressed={selectedCategory === cat}
                      onClick={() => applyCategory(selectedCategory === cat ? null : cat)}
                    >
                      {cat}<span className="bl-cat__count">{count}</span>
                    </button>
                  ))}
                </div>
              )}
              {filtering && (
                <button type="button" className="bl-clear" onClick={clearFilters}>
                  清除筛选<X aria-hidden="true" />
                </button>
              )}
            </div>
          </section>
        )}

        {posts.length === 0 ? (
          <div className="bl-empty">
            <p className="bl-empty__label" lang="en">Intermission · 幕间</p>
            <p className="bl-empty__text">节目单暂时留白，新曲正在酝酿。</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bl-empty">
            <p className="bl-empty__label" lang="en">Tacet · 此处无声</p>
            <p className="bl-empty__text">没有找到与当前条件相符的文章。</p>
            <button type="button" className="bl-empty__action" onClick={clearFilters}>
              清除筛选，查看全部 {posts.length} 篇<span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          <>
            {featured && (
              <div className="bl-feature-slot">
                <FeaturedCard post={featured} no={numbers.get(featured.id) ?? 1} />
              </div>
            )}
            {rest.length > 0 && (
              <ul className="bl-grid" data-count={Math.min(rest.length, 3)}>
                {rest.map((post, i) => (
                  <PostCard key={post.id} post={post} no={numbers.get(post.id) ?? i + 1} order={i} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <footer className="bl-footer">
        <div className="bl-wrap bl-footer__inner">
          <span className="bl-footer__group">
            <span>Moqian · Ballade</span>
            <a href="/blog/rss.xml">RSS</a>
          </span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
            京ICP备2026027832号
          </a>
        </div>
      </footer>
    </div>
  );
}
