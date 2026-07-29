import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Post } from '../types';
import { readerConfig } from '../config';
import { getBacklinks, resolveLink, wikiLinksToMarkdown, extractLinks } from '../utils/linkParser';

interface Props {
  post: Post;
  allPosts: Post[];
  onNavigate: (title: string) => void;
}

export default function PostReader({ post, allPosts, onNavigate }: Props) {
  const backlinks = useMemo(
    () => getBacklinks(post, allPosts),
    [post, allPosts],
  );

  const outLinks = useMemo(() => {
    return extractLinks(post.content).map((title) => ({
      title,
      exists: Boolean(resolveLink(title, allPosts)),
    }));
  }, [post.content, allPosts]);

  const mdContent = useMemo(() => wikiLinksToMarkdown(post.content), [post.content]);

  return (
    <article className="fade-up pt-2" style={{ animationDelay: '0.1s' }}>
      <div className="md-body font-serif-cn">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          urlTransform={(url) => url}
          components={{
            a: ({ href, children }) => {
              if (href?.startsWith('wiki:')) {
                return (
                  <span className="wiki-link" onClick={() => onNavigate(decodeURIComponent(href.slice(5)))}>
                    {children}
                  </span>
                );
              }
              return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }}
        >
          {mdContent}
        </ReactMarkdown>
      </div>

      {(outLinks.length > 0 || backlinks.length > 0) && (
        <div
          className="mt-12 pt-6 border-t border-[#1a1a1a] flex gap-x-8 gap-y-3 flex-wrap text-[0.75rem] leading-[1.8]"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {outLinks.length > 0 && (
            <div>
              <span className="text-[#404040] mr-3 tracking-[0.12em]">{readerConfig.outgoingLinksLabel}</span>
              {outLinks.map((link) => (
                <button
                  key={link.title}
                  onClick={() => onNavigate(link.title)}
                  className={`mr-3 transition-colors ${
                    link.exists ? 'text-[#8c8c8c] hover:text-[#e5e5e5]' : 'text-[#404040] hover:text-[#555]'
                  }`}
                >
                  {link.title}
                </button>
              ))}
            </div>
          )}
          {backlinks.length > 0 && (
            <div>
              <span className="text-[#404040] mr-3 tracking-[0.12em]">{readerConfig.incomingLinksLabel}</span>
              {backlinks.map((backlink) => (
                <button
                  key={backlink.id}
                  onClick={() => onNavigate(backlink.title)}
                  className="mr-3 text-[#8c8c8c] hover:text-[#e5e5e5] transition-colors"
                >
                  {backlink.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
