import { useId, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { GitHubIcon, GoogleIcon, Icon } from '@/components/account/icons';
import { GUESTBOOK_MAX_LENGTH, guestbookLength } from '@/lib/guestbook';
import '@/components/account/account.css';

type OAuthProvider = 'google' | 'github';

interface GuestbookComposerProps {
  pending: boolean;
  user: { name?: string | null; image?: string | null } | null;
  draft: string;
  submitting: boolean;
  error: string;
  sent: boolean;
  onDraft: (value: string) => void;
  onSubmit: () => void;
}

export default function GuestbookComposer({ pending, user, draft, submitting, error, sent, onDraft, onSubmit }: GuestbookComposerProps) {
  const fieldId = useId();
  const countId = useId();
  const errorId = useId();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [signInError, setSignInError] = useState('');
  const length = guestbookLength(draft);
  const tooLong = length > GUESTBOOK_MAX_LENGTH;
  const shownError = error || (tooLong ? '留言不能超过 500 个字符' : '') || signInError;
  const initial = Array.from(user?.name?.trim() || '访')[0] || '访';

  async function signIn(provider: OAuthProvider) {
    setBusy(provider);
    setSignInError('');
    try {
      const returnURL = `${window.location.origin}${window.location.pathname}${window.location.search}#guestbook`;
      const result = await authClient.signIn.social({ provider, callbackURL: returnURL, errorCallbackURL: returnURL });
      if (result.error) setSignInError(result.error.message || '登录请求失败，请重试');
    } catch {
      setSignInError('登录服务暂时不可用，请稍后重试');
    } finally {
      setBusy(null);
    }
  }

  if (pending && !user) return <p className="guestbook-pending">正在确认身份</p>;

  if (!user) {
    return (
      <div className="guestbook-gate">
        <p>登录后，留下你的声音</p>
        <button type="button" className="auth-action auth-action--provider" disabled={busy !== null} onClick={() => signIn('google')}>
          <GoogleIcon />{busy === 'google' ? '正在前往 Google…' : '使用 Google 登录'}<Icon name="arrow" className="auth-action__arrow" />
        </button>
        <button type="button" className="auth-action auth-action--provider" disabled={busy !== null} onClick={() => signIn('github')}>
          <GitHubIcon />{busy === 'github' ? '正在前往 GitHub…' : '使用 GitHub 登录'}<Icon name="arrow" className="auth-action__arrow" />
        </button>
        {shownError && <p className="guestbook-error" role="alert">{shownError}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div className="guestbook-identity">
        {user.image && user.image !== failedAvatar
          ? <img className="guestbook-avatar" src={user.image} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(user.image || null)} />
          : <span className="guestbook-avatar guestbook-avatar--fallback" aria-hidden="true">{initial}</span>}
        <strong>{user.name?.trim() || '访客'}</strong>
      </div>
      <label className="sr-only" htmlFor={fieldId}>留言</label>
      <textarea
        id={fieldId}
        className="guestbook-field"
        value={draft}
        rows={4}
        placeholder="写下想说的话"
        aria-invalid={Boolean(shownError)}
        aria-describedby={`${countId}${shownError ? ` ${errorId}` : ''}`}
        onChange={(event) => onDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!submitting && length >= 1 && !tooLong) onSubmit();
          }
        }}
      />
      <div className="guestbook-bar">
        <span id={countId} className="guestbook-count" data-over={tooLong || undefined}>{length}/500<span className="guestbook-hint"> · Ctrl + Enter 发送</span></span>
        <button type="submit" className="guestbook-button" disabled={submitting || length < 1 || tooLong} aria-busy={submitting}>
          {submitting ? '正在发送…' : '发送留言'}
        </button>
      </div>
      {shownError && <p id={errorId} className="guestbook-error" role="alert">{shownError}</p>}
      <p className="sr-only" role="status">{sent ? '留言已发送' : ''}</p>
    </form>
  );
}
