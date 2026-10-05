import { useEffect, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import AuthMenu from '@/components/AuthMenu';
import BlogBrandHome from '@/components/BlogBrandHome';
import { Icon } from '@/components/account/icons';
import { authClient } from '@/lib/auth-client';
import './admin.css';

export default function AdminShell({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  useEffect(() => { window.scrollTo(0, 0); }, [title]);
  return <div className="blog-admin">
    <header className="bl-topbar ws-topbar"><div className="ws-shell ws-topbar__inner">
      <BlogBrandHome />
      <nav className="ws-nav" aria-label="工作区导航">
        <NavLink to="/admin/posts">管理博文</NavLink>
        <NavLink to="/admin/upload">上传博文</NavLink>
        <Link to="/" className="ws-nav__back"><Icon name="back" /><span>返回博客</span></Link>
      </nav>
      <div className="ws-account"><AuthMenu /></div>
    </div></header>
    <main className="ws-shell ws-main">
      <div className="ws-intro">
        <p className="ws-kicker" lang="en">Workspace / Ballade</p>
        <h1>{title}<span aria-hidden="true">.</span></h1>
        {description && <p className="ws-intro__description">{description}</p>}
      </div>
      {isPending ? <div className="ws-state" role="status"><span className="ws-state__icon"><Icon name="user" /></span><h2>正在确认身份…</h2><p>稍等片刻，即可继续。</p></div>
        : error ? <div className="ws-state" role="alert"><span className="ws-state__icon"><Icon name="user" /></span><h2>暂时无法确认身份</h2><p>登录服务未响应，请稍后重试。</p><button type="button" className="ui-btn ui-btn--primary" onClick={() => void refetch()}>重新连接<Icon name="arrow" /></button></div>
          : session?.user.role !== 'super_admin' ? <div className="ws-state"><span className="ws-state__icon"><Icon name={session ? 'shield' : 'user'} /></span><h2>{session ? '此账号没有管理权限' : '登录后，继续创作。'}</h2><p>请使用已授权的超级管理员账号登录。</p><AuthMenu /></div>
            : children}
    </main>
    <footer className="ws-shell ws-footer"><span>Moqian · Ballade</span><span>留一处安静，安放文字。</span></footer>
  </div>;
}
