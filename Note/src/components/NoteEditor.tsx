import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Note } from '../types';
import { editorConfig } from '../config';
import { getBacklinks, resolveLink, wikiLinksToMarkdown, extractLinks } from '../utils/linkParser';

interface Props {
  note: Note;
  allNotes: Note[];
  onNavigate: (title: string) => void;
}

export default function NoteEditor({ note, allNotes, onNavigate }: Props) {
  const backlinks = useMemo(
    () => getBacklinks(note, allNotes),
    [note, allNotes],
  );

  const outLinks = useMemo(() => {
    return extractLinks(note.content).map((t) => ({
      title: t,
      exists: !!resolveLink(t, allNotes),
    }));
  }, [note.content, allNotes]);

  const mdContent = useMemo(() => wikiLinksToMarkdown(note.content), [note.content]);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar - clean and minimal */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-white/[0.04]">
        <span className="text-[10px] tracking-widest text-[#555] uppercase font-serif">{editorConfig.previewLabel}</span>
        <div className="flex-1" />
        {note.source && (
          <a href={note.source} target="_blank" rel="noopener noreferrer" className="text-xs text-accent/60 hover:text-accent truncate max-w-40">
            {editorConfig.sourceLabel}
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <article className="max-w-2xl mx-auto px-4 py-6 sm:px-8 sm:py-10">
          {/* Title */}
          <h1 className="font-serif-cn text-xl sm:text-2xl font-semibold text-[#e0e0e0] mb-6 sm:mb-8 leading-snug tracking-wide">
            {note.title}
          </h1>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 text-[11px] rounded-full border border-white/[0.06] text-[#777] tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
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

          {/* Links section */}
          {(outLinks.length > 0 || backlinks.length > 0) && (
            <div className="mt-12 pt-6 border-t border-white/[0.04] flex gap-6 flex-wrap text-xs">
              {outLinks.length > 0 && (
                <div>
                  <span className="text-[#444] mr-2 tracking-wider">{editorConfig.outgoingLinksLabel}</span>
                  {outLinks.map((l) => (
                    <button
                      key={l.title}
                      onClick={() => onNavigate(l.title)}
                      className={`mr-2 ${l.exists ? 'text-link/70 hover:text-link' : 'text-[#444] hover:text-[#666]'} transition-colors`}
                    >
                      {l.title}
                    </button>
                  ))}
                </div>
              )}
              {backlinks.length > 0 && (
                <div>
                  <span className="text-[#444] mr-2 tracking-wider">{editorConfig.incomingLinksLabel}</span>
                  {backlinks.map((bl) => (
                    <button
                      key={bl.id}
                      onClick={() => onNavigate(bl.title)}
                      className="mr-2 text-link/70 hover:text-link transition-colors"
                    >
                      {bl.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
