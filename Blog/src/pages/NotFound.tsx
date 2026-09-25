import { Link } from 'react-router';
import BlogBrandHome from '@/components/BlogBrandHome';
import AuthMenu from '@/components/AuthMenu';
import { headerConfig } from '@/config';

export default function NotFound() {
  return (
    <div className="blog-grid min-h-screen text-[#e5e5e5] flex flex-col">
      <header className="border-b border-[#1a1a1a]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <BlogBrandHome />
          <nav className="flex items-center gap-5 text-[0.75rem] tracking-[0.05em] text-[#8c8c8c]">
            <a href={headerConfig.noteUrl} className="inline-flex min-h-[44px] items-center hover:text-[#e5e5e5] transition-colors">
              笔记
            </a>
            <Link to="/" className="hover:text-[#e5e5e5] transition-colors">
              博客首页
            </Link>
            <AuthMenu />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] mx-auto w-full px-6 md:px-10 flex items-center">
        <div className="fade-up py-24 max-w-[46ch]">
          <span className="block text-[0.625rem] uppercase tracking-[0.22em] mb-6 text-[#404040]">
            Intermission · 幕间 · 404
          </span>
          <h1 className="spread__title mb-6">Tacet</h1>
          <p className="font-serif-cn text-[1rem] leading-[1.9] text-[#8c8c8c] mb-3">
            这一页在节目单上没有位置——也许曲目改过名字，也许链接抄漏了一段。
          </p>
          <p className="font-serif-cn text-[0.95rem] leading-[1.9] text-[#6b6b6b]">
            回到文集从头翻，或者去笔记那边看看正在生长的东西。
          </p>

          <nav className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[0.75rem] tracking-[0.05em]">
            <Link to="/" className="text-[#e5e5e5] hover:text-white transition-colors">
              返回文集 →
            </Link>
            <a href={headerConfig.homeUrl} className="text-[#8c8c8c] hover:text-[#e5e5e5] transition-colors">
              回到主页
            </a>
            <a href={headerConfig.noteUrl} className="text-[#8c8c8c] hover:text-[#e5e5e5] transition-colors">
              去笔记 ↗
            </a>
          </nav>
        </div>
      </main>

      <footer className="border-t border-[#1a1a1a]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-6 text-[0.625rem] tracking-[0.08em] text-[#404040]">
          <span>Moqian · Ballade</span>
        </div>
      </footer>
    </div>
  );
}
