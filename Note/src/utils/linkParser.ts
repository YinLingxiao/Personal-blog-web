import type { Note, GraphData, GraphNode, GraphEdge } from '../types';
import { graphConfig } from '../config';

/** A note's grouping key: its frontmatter category, or the "uncategorized" bucket. */
export function categoryOf(n: Note): string {
  return n.category?.trim() || graphConfig.uncategorizedLabel;
}

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
function buildResolver(notes: Note[]): Map<string, Note> {
  const map = new Map<string, Note>();
  for (const n of notes) {
    for (const key of [n.id, n.title, ...(n.aliases ?? [])]) {
      if (key) map.set(key.toLowerCase(), n);
    }
  }
  return map;
}

/** Resolve a [[link]] target to a note by slug, title, or alias. */
export function resolveLink(linkText: string, notes: Note[]): Note | undefined {
  return buildResolver(notes).get(linkText.trim().toLowerCase());
}

/**
 * Build the note-level graph. Resolution always runs against the full note set
 * (so we can tell "exists elsewhere" from "doesn't exist"), but when
 * `opts.category` is given we drill into one category: only intra-category edges
 * are drawn, links to notes in other categories are dropped (they surface in the
 * category overview instead), and unresolved links still become ghost nodes.
 */
export function buildGraphData(notes: Note[], opts: { category?: string } = {}): GraphData {
  const resolver = buildResolver(notes);
  const scoped = opts.category ? notes.filter(n => categoryOf(n) === opts.category) : notes;
  const scopedIds = new Set(scoped.map(n => n.id));

  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];
  const degree = new Map<string, number>();
  const ghosts = new Map<string, GraphNode>();

  for (const note of scoped) {
    for (const linkText of extractLinks(note.content)) {
      const target = resolver.get(linkText.trim().toLowerCase());
      let targetId: string;
      if (target) {
        if (target.id === note.id) continue;
        // In drill-down, ignore links that leave the current category.
        if (opts.category && !scopedIds.has(target.id)) continue;
        targetId = target.id;
      } else {
        targetId = `ghost:${linkText.trim().toLowerCase()}`;
        if (!ghosts.has(targetId)) {
          ghosts.set(targetId, { id: targetId, title: linkText.trim(), linkCount: 0, kind: 'ghost' });
        }
      }
      const key = [note.id, targetId].sort().join('::');
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push({ source: note.id, target: targetId });
        degree.set(note.id, (degree.get(note.id) || 0) + 1);
        degree.set(targetId, (degree.get(targetId) || 0) + 1);
      }
    }
  }

  const realNodes: GraphNode[] = scoped.map(n => ({
    id: n.id,
    title: n.title,
    linkCount: degree.get(n.id) || 0,
    kind: 'note',
  }));
  const ghostNodes: GraphNode[] = [...ghosts.values()].map(g => ({
    ...g,
    linkCount: degree.get(g.id) || 0,
  }));

  return { nodes: [...realNodes, ...ghostNodes], edges };
}

/**
 * Build the category overview graph: one node per category (sized by note count),
 * with an edge between two categories when a [[link]] crosses from one to the other.
 */
export function buildCategoryGraph(notes: Note[]): GraphData {
  const resolver = buildResolver(notes);

  const counts = new Map<string, number>();
  for (const n of notes) counts.set(categoryOf(n), (counts.get(categoryOf(n)) || 0) + 1);

  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];
  const degree = new Map<string, number>();

  for (const note of notes) {
    const from = categoryOf(note);
    for (const linkText of extractLinks(note.content)) {
      const target = resolver.get(linkText.trim().toLowerCase());
      if (!target || target.id === note.id) continue;
      const to = categoryOf(target);
      if (to === from) continue;
      const key = [from, to].sort().join('::');
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push({ source: `cat:${from}`, target: `cat:${to}` });
        degree.set(from, (degree.get(from) || 0) + 1);
        degree.set(to, (degree.get(to) || 0) + 1);
      }
    }
  }

  const nodes: GraphNode[] = [...counts.entries()].map(([name, count]) => ({
    id: `cat:${name}`,
    title: name,
    count,
    linkCount: degree.get(name) || 0,
    kind: 'category',
  }));

  return { nodes, edges };
}

/** Find notes that link TO the given note (matching its slug / title / aliases). */
export function getBacklinks(note: Note, notes: Note[]): Note[] {
  const keys = new Set(
    [note.id, note.title, ...(note.aliases ?? [])].map(k => k.toLowerCase()),
  );
  return notes.filter(
    n => n.id !== note.id && extractLinks(n.content).some(l => keys.has(l.trim().toLowerCase())),
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
