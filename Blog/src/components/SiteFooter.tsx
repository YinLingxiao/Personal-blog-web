import { authBaseURL } from '@/lib/auth-client';

export default function SiteFooter() {
  return (
    <footer className="bl-footer">
      <div className="bl-wrap bl-footer__inner">
        <span className="bl-footer__group">
          <span>Moqian · Ballade</span>
          <a href={`${authBaseURL}/api/content/blog/rss.xml`}>RSS</a>
        </span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
          京ICP备2026027832号
        </a>
      </div>
    </footer>
  );
}
