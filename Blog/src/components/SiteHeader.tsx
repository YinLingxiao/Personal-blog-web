import type { ReactNode } from 'react';
import AuthMenu from '@/components/AuthMenu';
import BlogBrandHome from '@/components/BlogBrandHome';

export default function SiteHeader({ children }: { children: ReactNode }) {
  return (
    <header className="bl-topbar">
      <div className="bl-wrap bl-topbar__inner">
        <BlogBrandHome />
        <nav className="bl-nav" aria-label="站点导航">
          {children}
          <AuthMenu />
        </nav>
      </div>
    </header>
  );
}
