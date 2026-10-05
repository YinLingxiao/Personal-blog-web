import { useMemo } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Post } from '../types';
import { readerConfig } from '../config';
import { getBacklinks, resolveLink, wikiLinksToMarkdown, extractLinks } from '../utils/linkParser';
import { normalizeDisplayMath } from '../../../shared/content/display-math.mjs';
import { editorSourcePositions, type EditorPreviewDocument } from '../lib/editor-preview';

interface Props {
  post: Post;
  allPosts: Post[];
  onNavigate: (title: string) => void;
  imageUrls?: Map<string, string>;
  preview?: boolean;
  sourceDocument?: EditorPreviewDocument;
}

export default function PostReader({ post, allPosts, onNavigate, imageUrls, preview = false, sourceDocument }: Props) {
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

  const mdContent = useMemo(() => sourceDocument?.markdown ?? wikiLinksToMarkdown(preview ? normalizeDisplayMath(post.content) : post.content), [post.content, preview, sourceDocument]);
  const sourcePlugin = useMemo(() => sourceDocument ? editorSourcePositions(sourceDocument) : null, [sourceDocument]);

  return (
    <article>
      <div className="md-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={sourcePlugin ? [sourcePlugin, rehypeKatex] : [rehypeKatex]}
          urlTransform={(url) => url.startsWith('wiki:') ? url : defaultUrlTransform(url)}
          components={{
            table: ({ children, node, ...props }) => { void node; return <div className="md-table"><table {...props}>{children}</table></div>; },
            img: ({ src, alt, title }) => <img alt={alt || ''} title={title} loading="lazy" decoding="async" src={src?.startsWith('./') && imageUrls ? imageUrls.get(src.slice(2)) : src} />,
            a: ({ href, children }) => {
              if (href?.startsWith('wiki:')) {
                return (
                  <button type="button" className="wiki-link" onClick={() => onNavigate(decodeURIComponent(href.slice(5)))}>
                    {children}
                  </button>
                );
              }
              return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }}
        >
          {mdContent}
        </ReactMarkdown>
      </div>

      {!preview && (outLinks.length > 0 || backlinks.length > 0) && (
        <div className="article-links">
          {outLinks.length > 0 && (
            <div>
              <span className="article-links__label">{readerConfig.outgoingLinksLabel}</span>
              {outLinks.map((link) => (
                <button key={link.title} type="button" data-missing={link.exists ? undefined : ''} onClick={() => onNavigate(link.title)}>
                  {link.title}
                </button>
              ))}
            </div>
          )}
          {backlinks.length > 0 && (
            <div>
              <span className="article-links__label">{readerConfig.incomingLinksLabel}</span>
              {backlinks.map((backlink) => (
                <button key={backlink.id} type="button" onClick={() => onNavigate(backlink.title)}>
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
