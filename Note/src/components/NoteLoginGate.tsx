import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { GitHubIcon, GoogleIcon } from '@/components/account/icons';
import '@/components/account/account.css';

type OAuthProvider = 'google' | 'github';

export default function NoteLoginGate() {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');

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

  return (
    <div className="h-full flex items-center justify-center px-6">
      <section className="w-full max-w-[280px] text-center font-serif-cn" aria-labelledby="note-login-gate-title">
        <h2 id="note-login-gate-title" className="text-sm text-[#bbb] tracking-wide">登录后可查看笔记</h2>
        <p className="mt-2 mb-5 text-xs text-[color:var(--faint)]">这些笔记只对登录的读者展开。</p>
        <button type="button" className="auth-action auth-action--provider" disabled={busy !== null} onClick={() => signIn('google')}>
          <GoogleIcon />{busy === 'google' ? '正在前往 Google…' : '使用 Google 登录'}
        </button>
        <button type="button" className="auth-action auth-action--provider" disabled={busy !== null} onClick={() => signIn('github')}>
          <GitHubIcon />{busy === 'github' ? '正在前往 GitHub…' : '使用 GitHub 登录'}
        </button>
        {error && <p className="auth-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
