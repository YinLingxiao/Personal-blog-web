import { useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { siteConfig } from '@/config';
import BlogBrandHome from '@/components/BlogBrandHome';
import AuthMenu from '@/components/AuthMenu';
import PostReader from '@/components/PostReader';
import { usePosts } from '@/hooks/usePosts';
import { resolveLink } from '@/utils/linkParser';

function formatDate(ts: number) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export default function ArticleLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { posts } = usePosts();

  useEffect(() => {
    document.title = siteConfig.title;
    document.documentElement.lang = siteConfig.language;
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const sorted = useMemo(() => [...posts].sort((a, b) => b.updatedAt - a.updatedAt), [posts]);
  const index = sorted.findIndex((post) => post.id === id);
  const selectedPost = index >= 0 ? sorted[index] : null;
  const newerPost = index > 0 ? sorted[index - 1] : null;
  const olderPost = index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null;

  const handleNavigate = useCallback(
    (title: string) => {
      const found = resolveLink(title, sorted);
      if (found) navigate(`/post/${found.id}`);
    },
    [sorted, navigate],
  );

  return (
    <div className="min-h-screen text-[#e5e5e5]">
      <header className="border-b border-[#1a1a1a]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <BlogBrandHome />
          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="group flex items-center gap-2 text-[0.75rem] tracking-[0.05em] text-[#8c8c8c] hover:text-[#e5e5e5] transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              博客首页
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <AuthMenu />
          </div>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-6 md:px-8 py-14 md:py-20">
        {selectedPost ? (
          <>
            <header className="fade-up">
              {selectedPost.cover && (
                <div className="article-cover mb-8 md:mb-10">
                  <img src={selectedPost.cover} alt="" decoding="async" />
                  <span aria-hidden />
                </div>
              )}
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.625rem] tracking-[0.14em] uppercase text-[#404040]"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                <time dateTime={new Date(selectedPost.updatedAt).toISOString()}>
                  {formatDate(selectedPost.updatedAt)}
                </time>
                {selectedPost.category && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{selectedPost.category}</span>
                  </>
                )}
                {selectedPost.tags.map((tag) => (
                  <span key={tag} aria-hidden>
                    #{tag}
                  </span>
                ))}
              </div>
              <h1 className="font-serif-cn text-[1.75rem] md:text-[2.25rem] font-bold leading-[1.4] tracking-[0.01em] mt-4 text-[#e5e5e5]">
                {selectedPost.title}
              </h1>
              <div className="mt-8 md:mt-10 border-t border-[#1a1a1a]" />
            </header>

            <PostReader key={selectedPost.id} post={selectedPost} allPosts={sorted} onNavigate={handleNavigate} />

            <nav
              className="mt-16 md:mt-20 pt-6 border-t border-[#1a1a1a] flex items-start justify-between gap-6 text-[0.8125rem] leading-[1.7]"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {newerPost ? (
                <Link to={`/post/${newerPost.id}`} className="group max-w-[45%] text-[#8c8c8c] hover:text-[#e5e5e5] transition-colors">
                  <span className="block text-[0.625rem] tracking-[0.16em] uppercase text-[#404040] mb-1">
                    ← 较新一篇
                  </span>
                  {newerPost.title}
                </Link>
              ) : (
                <span />
              )}
              {olderPost ? (
                <Link to={`/post/${olderPost.id}`} className="group max-w-[45%] text-right text-[#8c8c8c] hover:text-[#e5e5e5] transition-colors">
                  <span className="block text-[0.625rem] tracking-[0.16em] uppercase text-[#404040] mb-1">
                    较旧一篇 →
                  </span>
                  {olderPost.title}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        ) : (
          <div className="fade-up text-center py-24">
            <span
              className="block text-[0.625rem] uppercase tracking-[0.22em] mb-3 text-[#404040]"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              Intermission · 幕间
            </span>
            <p className="font-serif-cn text-[0.95rem] text-[#8c8c8c]">这一页不在节目单上。</p>
            <Link
              to="/"
              className="inline-block mt-6 text-[0.75rem] tracking-[0.05em] text-[#8c8c8c] hover:text-[#e5e5e5] transition-colors"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              返回全部文章 →
            </Link>
          </div>
        )}
      </main>

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
