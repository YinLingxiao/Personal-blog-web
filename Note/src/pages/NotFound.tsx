import { Link } from 'react-router';
import NoteBrandHome from '@/components/NoteBrandHome';
import { headerConfig } from '@/config';

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#050505' }}>
      <header className="note-toolbar liquid-glass h-11 shrink-0 flex items-center justify-between px-4">
        <div className="relative z-10 flex items-center gap-3">
          <NoteBrandHome />
        </div>
        <div className="note-toolbar__actions relative z-10 flex items-center gap-1">
          <a
            href={headerConfig.blogUrl}
            className="font-serif-cn px-2.5 py-1.5 text-xs text-[#666] hover:text-[#ccc] transition-colors"
          >
            {headerConfig.blogButtonLabel}
          </a>
          <Link
            to="/"
            className="group font-serif-cn ml-1 pl-2.5 px-2.5 py-1.5 text-xs text-[#666] hover:text-[#ccc] transition-colors border-l border-white/[0.06] flex items-center gap-1.5"
          >
            笔记首页
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-[42ch]">
          <span className="block text-[0.625rem] uppercase tracking-[0.22em] mb-5 text-[#404040]">
            Intermission · 幕间 · 404
          </span>
          <h1 className="font-serif-cn text-[1.75rem] leading-[1.4] text-[#e0e0e0] mb-5">
            这条路径没有对应的笔记
          </h1>
          <p className="font-serif-cn text-[0.95rem] leading-[1.9] text-[#888]">
            笔记的地址跟着标题走，标题改过之后旧链接就断了。从脉络图里找找，或者回首页重新翻。
          </p>

          <nav className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs">
            <Link to="/graph" className="font-serif-cn text-[#ccc] hover:text-[#e0e0e0] transition-colors">
              打开脉络图 →
            </Link>
            <Link to="/" className="font-serif-cn text-[#888] hover:text-[#ccc] transition-colors">
              笔记首页
            </Link>
            <a
              href={headerConfig.homeUrl}
              className="font-serif-cn text-[#888] hover:text-[#ccc] transition-colors"
            >
              回到主页
            </a>
          </nav>
        </div>
      </main>
    </div>
  );
}
