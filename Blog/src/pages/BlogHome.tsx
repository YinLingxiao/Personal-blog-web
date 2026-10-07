import { useEffect } from "react";
import BlogIndex from "@/components/BlogIndex";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ParticleBackground from "@/components/ParticleBackground";
import { useMotionPolicy } from "@/components/motion/motion";
import { usePosts } from "@/hooks/usePosts";
import { siteConfig, headerConfig } from "@/config";

export default function BlogHome() {
  const { posts, isLoading, error } = usePosts();
  const { reduced } = useMotionPolicy();

  useEffect(() => {
    document.title = siteConfig.title;
    document.documentElement.lang = siteConfig.language;
  }, []);

  return (
    <div className="editorial-blog editorial-blog--live">
      <a className="ae-skip" href="#ae-main">
        跳到正文
      </a>
      <div className="ae-site-header">
        {!reduced && (
          <div className="ae-top-atmosphere">
            <ParticleBackground />
          </div>
        )}
        <SiteHeader>
          <a href={headerConfig.noteUrl}>笔记</a>
          <span aria-current="page">博客首页</span>
        </SiteHeader>
      </div>
      <main id="ae-main" className="ae-shell">
        <BlogIndex posts={posts} isLoading={isLoading} error={error} />
      </main>
      <SiteFooter />
    </div>
  );
}
