import { Link } from 'react-router';
import { useEffect, useId, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';

type OAuthProvider = 'google' | 'github';

interface AuthMenuProps {
  compact?: boolean;
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.75 19c.55-3.3 2.65-5 6.25-5s5.7 1.7 6.25 5" />
    </svg>
  );
}

export default function AuthMenu({ compact = false }: AuthMenuProps) {
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<OAuthProvider | 'signout' | null>(null);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
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
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.href,
        errorCallbackURL: window.location.href,
      });
      if (result.error) setError(result.error.message || '登录请求失败');
    } catch {
      setError('身份服务暂时不可用');
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy('signout');
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) setError(result.error.message || '退出失败');
      else setOpen(false);
    } catch {
      setError('身份服务暂时不可用');
    } finally {
      setBusy(null);
    }
  }

  const user = session?.user;
  const initial = user?.name?.trim().charAt(0) || user?.email?.charAt(0) || 'M';

  return (
    <div ref={rootRef} className={`auth-menu${compact ? ' auth-menu--compact' : ''}`}>
      <button
        type="button"
        className="auth-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={user ? `账户：${user.name || user.email}` : '登录'}
        onClick={() => setOpen((value) => !value)}
      >
        {isPending ? (
          <span className="auth-avatar auth-avatar--loading" aria-hidden="true" />
        ) : user?.image ? (
          <img className="auth-avatar" src={user.image} alt="" referrerPolicy="no-referrer" />
        ) : user ? (
          <span className="auth-avatar auth-avatar--initial" aria-hidden="true">{initial}</span>
        ) : (
          <span className="auth-user-icon"><UserIcon /></span>
        )}
        <span className="auth-trigger__label">{user ? user.name || '账户' : '登录'}</span>
      </button>

      {open && (
        <div id={menuId} className="auth-popover" role="dialog" aria-label={user ? '账户菜单' : '登录方式'}>
          {user ? (
            <>
              <div className="auth-account">
                <span className="auth-account__eyebrow">Signed in · 已登录</span>
                <strong>{user.name || 'Moqian'}</strong>
                <span>{user.email}</span>
              </div>
              {user.role === 'super_admin' && (
                <Link to="/admin/upload" className="auth-action" onClick={() => setOpen(false)}>上传博文</Link>
              )}
              <button type="button" className="auth-action auth-action--quiet" disabled={busy !== null} onClick={signOut}>
                {busy === 'signout' ? '正在退出…' : '退出登录'}
              </button>
            </>
          ) : (
            <>
              <div className="auth-account">
                <span className="auth-account__eyebrow">Identity · 身份</span>
                <strong>登录 Moqian</strong>
                <span>三处站点，共用同一段会话。</span>
              </div>
              <button type="button" className="auth-action" disabled={busy !== null} onClick={() => signIn('google')}>
                <span>G</span>{busy === 'google' ? '正在前往 Google…' : '使用 Google 登录'}
              </button>
              <button type="button" className="auth-action" disabled={busy !== null} onClick={() => signIn('github')}>
                <span>GH</span>{busy === 'github' ? '正在前往 GitHub…' : '使用 GitHub 登录'}
              </button>
            </>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
