import { Link } from 'react-router';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { headerConfig } from '@/config';

export default function NotFound() {
  return (
    <div className="blog-grid min-h-screen flex flex-col">
      <SiteHeader>
        <a href={headerConfig.noteUrl}>笔记</a>
        <Link to="/">博客首页</Link>
      </SiteHeader>

      <main className="bl-wrap flex-1 flex items-center">
        <div className="py-24 max-w-[46ch]">
          <p className="page-state__label" lang="en">Intermission · 幕间 · 404</p>
          <h1 className="spread__title mb-6">Tacet</h1>
          <p className="font-serif-cn text-[1rem] leading-[1.9] text-[color:var(--body)] mb-3">
            这一页在节目单上没有位置——也许曲目改过名字，也许链接抄漏了一段。
          </p>
          <p className="font-serif-cn text-[0.9375rem] leading-[1.9] text-[color:var(--meta)]">
            回到文集从头翻，或者去笔记那边看看正在生长的东西。
          </p>

          <nav className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="去往">
            <Link to="/" className="ui-btn ui-btn--strong">
              返回文集<span aria-hidden="true">→</span>
            </Link>
            <a href={headerConfig.homeUrl} className="ui-btn ui-btn--quiet">
              回到主页
            </a>
            <a href={headerConfig.noteUrl} className="ui-btn ui-btn--quiet">
              去笔记 ↗
            </a>
          </nav>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
