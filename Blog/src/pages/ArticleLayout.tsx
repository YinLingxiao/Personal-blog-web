import { useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { siteConfig } from '@/config';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PostReader from '@/components/PostReader';
import { usePosts } from '@/hooks/usePosts';
import { resolveLink } from '@/utils/linkParser';
import { authClient } from '@/lib/auth-client';

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
  const { data: session } = authClient.useSession();
  const { posts, isLoading, error } = usePosts();

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
    <div className="blog-grid flex min-h-screen flex-col">
      <SiteHeader>
        {session?.user.role === 'super_admin' && selectedPost && (
          <Link to={`/admin/posts/${encodeURIComponent(selectedPost.id)}/edit`}>编辑</Link>
        )}
        <Link to="/">博客首页</Link>
      </SiteHeader>

      <main className="article flex-1 w-full">
        {selectedPost ? (
          <>
            <header>
              {selectedPost.cover && (
                <figure className="article__cover">
                  <img src={selectedPost.cover} alt="" decoding="async" />
                </figure>
              )}
              <p className="article__meta">
                <time dateTime={new Date(selectedPost.updatedAt).toISOString()}>
                  {formatDate(selectedPost.updatedAt)}
                </time>
                {selectedPost.category && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="article__cat">{selectedPost.category}</span>
                  </>
                )}
                {selectedPost.tags.length > 0 && (
                  <span className="article__tags">
                    {selectedPost.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </span>
                )}
              </p>
              <h1 className="article__title">{selectedPost.title}</h1>
              <div className="article__rule" />
            </header>

            <div className="article__body">
              <PostReader key={selectedPost.id} post={selectedPost} allPosts={sorted} onNavigate={handleNavigate} />
            </div>

            {(newerPost || olderPost) && (
              <nav className="article-pager" aria-label="相邻文章">
                {newerPost && (
                  <Link to={`/post/${newerPost.id}`}>
                    <span className="article-pager__label">← 较新一篇</span>
                    {newerPost.title}
                  </Link>
                )}
                {olderPost && (
                  <Link to={`/post/${olderPost.id}`} className="article-pager__older">
                    <span className="article-pager__label">较旧一篇 →</span>
                    {olderPost.title}
                  </Link>
                )}
              </nav>
            )}
          </>
        ) : isLoading ? (
          <div className="page-state"><p className="page-state__text">正在打开文章…</p></div>
        ) : error ? (
          <div className="page-state"><p className="page-state__text">暂时无法读取文章，请稍后刷新重试。</p></div>
        ) : (
          <div className="page-state">
            <p className="page-state__label" lang="en">Intermission · 幕间</p>
            <p className="page-state__text">这一页不在节目单上。</p>
            <Link to="/" className="ui-btn">返回全部文章<span aria-hidden="true">→</span></Link>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
