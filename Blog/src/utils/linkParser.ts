import type { Post } from '../types';

/** Strip code blocks and inline code from text */
function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

/** Extract all [[wiki links]] from content (ignoring code blocks) */
export function extractLinks(content: string): string[] {
  const clean = stripCode(content);
  const re = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) links.push(m[1]);
  return [...new Set(links)];
}

/**
 * Build a lookup from any of a note's identities (slug / title / alias,
 * lowercased) to the note — mirrors how Obsidian resolves [[links]].
 */
function buildResolver(posts: Post[]): Map<string, Post> {
  const map = new Map<string, Post>();
  for (const post of posts) {
    for (const key of [post.id, post.title, ...(post.aliases ?? [])]) {
      if (key) map.set(key.toLowerCase(), post);
    }
  }
  return map;
}

/** Resolve a [[link]] target to a note by slug, title, or alias. */
export function resolveLink(linkText: string, posts: Post[]): Post | undefined {
  return buildResolver(posts).get(linkText.trim().toLowerCase());
}

/** Find notes that link TO the given note (matching its slug / title / aliases). */
export function getBacklinks(post: Post, posts: Post[]): Post[] {
  const keys = new Set(
    [post.id, post.title, ...(post.aliases ?? [])].map(k => k.toLowerCase()),
  );
  return posts.filter(
    candidate => candidate.id !== post.id && extractLinks(candidate.content).some(l => keys.has(l.trim().toLowerCase())),
  );
}

/** Render content with [[links]] replaced for markdown — skips code blocks */
export function wikiLinksToMarkdown(content: string): string {
  return content.replace(
    /(```[\s\S]*?```|`[^`]*`)|(\[\[([^\]]+)\]\])/g,
    (_match, code, _wikiLink, title) => {
      if (code) return code;
      return `[${title}](wiki:${encodeURIComponent(title)})`;
    },
  );
}
