import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { Search } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import { Icon } from '@/components/account/icons';
import { authClient } from '@/lib/auth-client';
import { downloadBlog, listManagedPosts, publishSaved, type ManagedPost } from '@/lib/admin-api';

function statusOf(post: ManagedPost) {
  if (post.publishFailed) return { state: 'failed', label: '发布失败', detail: '修改已保存' };
  if (post.draft) return { state: 'draft', label: '草稿', detail: '暂不公开' };
  if (post.published) return { state: 'published', label: '已发布', detail: '' };
  return { state: 'pending', label: '尚未发布', detail: '' };
}

export default function AdminPosts() {
  const { data: session } = authClient.useSession();
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState('');
  const searchId = useId();
  useEffect(() => {
    if (session?.user.role !== 'super_admin') return;
    const controller = new AbortController();
    listManagedPosts(controller.signal).then((items) => { setPosts(items); setError(''); })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session?.user.role, refresh]);
  useEffect(() => { document.title = '管理博文 · Moqian'; }, []);
  async function action(slug: string, kind: 'download' | 'backup' | 'publish') {
    setBusy(`${slug}:${kind}`); setError(''); setMessage('');
    try {
      if (kind === 'publish') { const result = await publishSaved('blog', slug); setMessage(result.message); setRefresh((value) => value + 1); }
      else await downloadBlog(slug, kind === 'backup');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败，请重试'); }
    finally { setBusy(''); }
  }
  const visible = posts.filter((post) => `${post.title} ${post.slug} ${post.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <AdminShell title="管理博文" description="编辑公开文章与草稿。下载文章包可把网页修改保存到本地；上一版备份可重新上传恢复。">
    <div className="ws-toolbar">
      <div className="ws-search">
        <label htmlFor={searchId} className="ws-search__label">检索</label>
        <Search className="ws-search__icon" aria-hidden="true" />
        <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && query) { event.preventDefault(); setQuery(''); } }} placeholder="标题、分类或文章名称" autoComplete="off" />
      </div>
      <Link className="ui-btn ui-btn--primary" to="/admin/upload"><Icon name="upload" />上传新博文</Link>
    </div>
    {error && <div role="alert" className="ui-note ui-note--error"><span>{error}</span><button type="button" className="ui-btn ui-btn--quiet" onClick={() => setRefresh((value) => value + 1)}>重新读取</button></div>}
    {message && <p role="status" className="ui-note ui-note--success">{message}</p>}
    {loading ? <p role="status" className="ws-loading">正在读取博文…</p> : <>
      <p className="ws-summary" aria-live="polite">{query.trim() ? `${visible.length} / ${posts.length} 篇` : `共 ${posts.length} 篇`}</p>
      {visible.length ? <>
        <div className="admin-list-head" aria-hidden="true"><span>标题</span><span>分类</span><span>状态</span><span>操作</span></div>
        <ul className="admin-list">{visible.map((post) => {
          const status = statusOf(post);
          const rowBusy = busy.startsWith(`${post.slug}:`);
          return <li key={post.slug} className="admin-row" aria-busy={rowBusy}>
            <div className="admin-row__main">
              <h2 className="admin-row__title">{post.title}</h2>
              <p className="admin-row__slug">/post/{post.slug}</p>
            </div>
            <p className="admin-row__cat"><span className="sr-only">分类：</span>{post.category}</p>
            <p className="admin-status" data-state={status.state}><span className="admin-status__dot" aria-hidden="true" /><span>{status.label}{status.detail && <small>{status.detail}</small>}</span></p>
            <div className="admin-row__actions">
              <Link className="ui-btn ui-btn--strong admin-row__edit" to={`/admin/posts/${encodeURIComponent(post.slug)}/edit`} aria-label={`编辑：${post.title}`}>编辑<Icon name="pen" /></Link>
              <div className="admin-row__more">
                <button type="button" className="ui-btn ui-btn--quiet" disabled={Boolean(busy)} onClick={() => void action(post.slug, 'download')}>{busy === `${post.slug}:download` ? '正在打包…' : '下载文章包'}</button>
                {post.hasBackup && <button type="button" className="ui-btn ui-btn--quiet" disabled={Boolean(busy)} onClick={() => void action(post.slug, 'backup')}>{busy === `${post.slug}:backup` ? '正在打包…' : '下载上一版'}</button>}
                <button type="button" className="ui-btn ui-btn--quiet" disabled={Boolean(busy)} onClick={() => void action(post.slug, 'publish')}>{busy === `${post.slug}:publish` ? '正在发布…' : '重新发布'}</button>
                {post.published && <Link className="ui-btn ui-btn--quiet" to={`/post/${encodeURIComponent(post.slug)}`}>查看文章 ↗</Link>}
              </div>
            </div>
          </li>;
        })}</ul>
      </> : <div className="ws-empty"><p className="ws-kicker" lang="en">Tacet</p><p>{posts.length ? '没有符合条件的博文。' : '这里暂时还没有博文。'}</p>{query && <button type="button" className="ui-btn" onClick={() => setQuery('')}>清空检索</button>}</div>}
    </>}
  </AdminShell>;
}
