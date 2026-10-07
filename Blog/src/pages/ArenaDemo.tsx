import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import PostReader from "@/components/PostReader";
import SiteHeader from "@/components/SiteHeader";
import ParticleBackground from "@/components/ParticleBackground";
import { useMotionPolicy } from "@/components/motion/motion";
import { headerConfig } from "@/config";
import { demoPosts } from "./arena-demo-data";
import BlogIndex from "@/components/BlogIndex";
import "./editorial.css";

const base = "/demo/arena";
export default function ArenaDemo() {
  const { reduced } = useMotionPolicy();
  const { id } = useParams();
  const navigate = useNavigate();
  const post = demoPosts.find(entry => entry.id === id);

  useEffect(() => {
    document.title = post ? `${post.title} · 墨浅文集` : "墨浅文集 · Ballade";
    window.scrollTo(0, 0);
  }, [id, post]);

  return (
    <div className="editorial-blog">
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
          {id ? (
            <Link to={base}>博客首页</Link>
          ) : (
            <span aria-current="page">博客首页</span>
          )}
        </SiteHeader>
      </div>
      <div className="ae-shell">
        <main id="ae-main">
          {!id ? (
            <BlogIndex posts={demoPosts} postBase={base} />
          ) : post ? (
            <article className="ae-reader">
              <Link className="ae-back" to={base}>
                <ArrowLeft size={15} />
                <span lang="en">Ballade</span>
              </Link>
              <header>
                <p className="ae-meta">
                  <span className="ae-category">{post.category}</span>
                  <span>
                    墨浅 —{" "}
                    <time dateTime={new Date(post.updatedAt).toISOString()}>
                      {new Date(post.updatedAt)
                        .toISOString()
                        .slice(0, 10)
                        .replaceAll("-", ".")}
                    </time>
                  </span>
                </p>
                <h1>{post.title}</h1>
                <p className="ae-reader__summary">{post.summary}</p>
                {post.sample && <p className="ae-sample">排版示例</p>}
              </header>
              <div className="ae-reader__body">
                <PostReader
                  post={post}
                  allPosts={demoPosts}
                  onNavigate={title => {
                    const found = demoPosts.find(
                      entry => entry.title === title || entry.id === title
                    );
                    if (found) navigate(`${base}/${found.id}`);
                  }}
                />
              </div>
              <Link className="ae-read" to={base}>
                <ArrowLeft size={15} />
                返回文集
              </Link>
            </article>
          ) : (
            <div className="ae-empty">
              <p>这一页暂时留白。</p>
              <Link to={base}>返回文集</Link>
            </div>
          )}
        </main>

        <footer className="ae-footer">
          <div className="ae-footer__lead">
            <div>
              <BrandMark className="ae-footer__mark" autoplay={false} />
              <span lang="en">Ballade</span>
            </div>
          </div>
          <div className="ae-footer__links">
            <Link to="/">现有博客</Link>
            <a href="https://api.moqian.me/api/content/blog/rss.xml">
              RSS
              <ArrowUpRight size={12} />
            </a>
          </div>
          <p className="ae-demo-note">
            设计预览 · 首篇为现有博文，其余为排版示例。
          </p>
        </footer>
      </div>
    </div>
  );
}
