import { describe, expect, it } from 'vitest';
import type { Note } from '../types';
import {
  buildCategoryGraph,
  buildGraphData,
  categoryOf,
  extractLinks,
  getBacklinks,
  resolveLink,
  wikiLinksToMarkdown,
} from './linkParser';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'alpha',
    title: 'Alpha Note',
    content: '',
    createdAt: 1,
    updatedAt: 1,
    tags: [],
    aliases: ['First'],
    category: 'Math',
    ...overrides,
  };
}

describe('Note wiki links', () => {
  it('extracts unique links and ignores inline and fenced code', () => {
    const content = '[[Alpha]] and [[Alpha]] and `[[Inline]]`\n```md\n[[Fence]]\n```\n[[Beta]]';
    expect(extractLinks(content)).toEqual(['Alpha', 'Beta']);
  });

  it('resolves notes by id, title, and alias without case sensitivity', () => {
    const notes = [makeNote()];
    expect(resolveLink('ALPHA', notes)?.id).toBe('alpha');
    expect(resolveLink('alpha note', notes)?.id).toBe('alpha');
    expect(resolveLink(' first ', notes)?.id).toBe('alpha');
  });

  it('returns backlinks and preserves code during conversion', () => {
    const target = makeNote({ content: '[[Alpha Note]]' });
    const referring = makeNote({ id: 'beta', title: 'Beta', aliases: [], content: 'See [[First]]' });
    expect(getBacklinks(target, [target, referring]).map((note) => note.id)).toEqual(['beta']);
    expect(wikiLinksToMarkdown('[[Alpha Note]] `[[Inline]]`')).toBe('[Alpha Note](wiki:Alpha%20Note) `[[Inline]]`');
  });
});

describe('Note graph construction', () => {
  it('uses the uncategorized label for blank categories', () => {
    expect(categoryOf(makeNote({ category: ' ' }))).toBe('未分类');
  });

  it('counts categories and deduplicates cross-category edges', () => {
    const notes = [
      makeNote({ id: 'alpha', title: 'Alpha', content: '[[Beta]] [[Gamma]]' }),
      makeNote({ id: 'beta', title: 'Beta', aliases: [], category: 'Physics', content: '[[Alpha]]' }),
      makeNote({ id: 'gamma', title: 'Gamma', aliases: [], category: 'Physics' }),
    ];
    const graph = buildCategoryGraph(notes);
    expect(graph.nodes.map(({ title, count }) => [title, count])).toEqual([['Math', 1], ['Physics', 2]]);
    expect(graph.edges).toEqual([{ source: 'cat:Math', target: 'cat:Physics' }]);
  });

  it('keeps local and ghost links while dropping self and cross-category links in a drill-down', () => {
    const notes = [
      makeNote({ id: 'alpha', title: 'Alpha', content: '[[Alpha]] [[Delta]] [[Beta]] [[Missing]]' }),
      makeNote({ id: 'delta', title: 'Delta', aliases: [], category: 'Math' }),
      makeNote({ id: 'beta', title: 'Beta', aliases: [], category: 'Physics' }),
    ];
    const graph = buildGraphData(notes, { category: 'Math' });
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['alpha', 'delta', 'ghost:missing']);
    expect(graph.edges).toEqual([
      { source: 'alpha', target: 'delta' },
      { source: 'alpha', target: 'ghost:missing' },
    ]);
  });
});
