import { useEffect, useId, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { getUploadLinks, type Site } from './destinations';
import { GitHubIcon, GoogleIcon, Icon } from './icons';
import './account.css';

type OAuthProvider = 'google' | 'github';

export default function AccountMenu({ site, compact = false }: { site: Site; compact?: boolean }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<OAuthProvider | 'signout' | null>(null);
  const [error, setError] = useState('');
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const user = session?.user;
  const isAdmin = user?.role === 'super_admin';
  const initial = user?.name?.trim().charAt(0) || user?.email?.charAt(0) || 'M';

  useEffect(() => {
    if (!open) return;
    popoverRef.current?.querySelector<HTMLElement>('.auth-action')?.focus();
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  async function signIn(provider: OAuthProvider) {
    setBusy(provider);
    setError('');
    try {
      const result = await authClient.signIn.social({ provider, callbackURL: window.location.href, errorCallbackURL: window.location.href });
      if (result.error) setError(result.error.message || '登录请求失败，请重试');
    } catch {
      setError('登录服务暂时不可用，请稍后重试');
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy('signout');
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) setError(result.error.message || '退出失败，请重试');
      else setOpen(false);
    } catch {
      setError('登录服务暂时不可用，请稍后重试');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={rootRef} className={`auth-menu${compact ? ' auth-menu--compact' : ''}`} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
    }}>
      <button ref={triggerRef} type="button" className="auth-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={menuId}
        aria-label={user ? `${isAdmin ? '超管账户' : '账户'}：${user.name || user.email}` : '登录'}
        onClick={() => { setOpen(!open); if (!open) void refetch(); }}>
        <span className="auth-avatar-wrap">
          {user?.image && user.image !== failedAvatar ? <img className="auth-avatar" src={user.image} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(user.image || null)} />
            : user ? <span className="auth-avatar auth-avatar--initial" aria-hidden="true">{initial}</span>
              : isPending ? <span className="auth-avatar auth-avatar--loading" aria-hidden="true" />
                : <span className="auth-user-icon"><Icon name="user" /></span>}
          {isAdmin && <span className="auth-admin-mark" title="超级管理员"><Icon name="shield" /></span>}
        </span>
        <span className="auth-trigger__label">{user ? user.name || '账户' : '登录'}</span>
        <Icon name="chevron" className="auth-chevron" />
      </button>

      {open && <div ref={popoverRef} id={menuId} className="auth-popover" role="dialog" aria-label={user ? '账户菜单' : '登录方式'}>
        {user ? <>
          <div className="auth-account">
            <span className={`auth-account__status${isAdmin ? ' auth-account__status--admin' : ''}`}><Icon name={isAdmin ? 'shield' : 'check'} />{isAdmin ? '超级管理员' : '已登录'}</span>
            <strong>{user.name || 'Moqian'}</strong><span className="auth-account__email">{user.email}</span>
          </div>
          {isAdmin && <div className="auth-workspace" aria-label="内容管理">
            <p className="auth-section-label">创作与管理</p>
            {getUploadLinks(site).map((link) => <a key={link.target} href={link.href} className="auth-action auth-action--destination" onClick={() => setOpen(false)}>
              <Icon name={link.icon} /><span className="auth-action__copy"><span>{link.label}</span><small>{link.subtitle}</small></span><Icon name="arrow" className="auth-action__arrow" />
            </a>)}
          </div>}
          <button type="button" className="auth-action auth-action--quiet" disabled={busy !== null} onClick={signOut}><Icon name="logout" />{busy === 'signout' ? '正在退出…' : '退出登录'}</button>
        </> : <>
          <div className="auth-account"><span className="auth-section-label">WELCOME BACK</span><strong>登录 Moqian</strong><p>在主页、博客与笔记之间，保持登录。</p></div>
          <button type="button" className="auth-action auth-action--provider" disabled={busy !== null || isPending} onClick={() => signIn('google')}><GoogleIcon />{busy === 'google' ? '正在前往 Google…' : '使用 Google 登录'}<Icon name="arrow" className="auth-action__arrow" /></button>
          <button type="button" className="auth-action auth-action--provider" disabled={busy !== null || isPending} onClick={() => signIn('github')}><GitHubIcon />{busy === 'github' ? '正在前往 GitHub…' : '使用 GitHub 登录'}<Icon name="arrow" className="auth-action__arrow" /></button>
        </>}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </div>}
    </div>
  );
}
