import { describe, expect, it } from 'vitest';
import type { Post } from '../types';
import { extractLinks, getBacklinks, resolveLink, wikiLinksToMarkdown } from './linkParser';

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'alpha',
    title: 'Alpha Post',
    content: '',
    createdAt: 1,
    updatedAt: 1,
    tags: [],
    aliases: ['First'],
    ...overrides,
  };
}

describe('Blog wiki links', () => {
  it('extracts unique links and ignores inline and fenced code', () => {
    const content = '[[Alpha]] and [[Alpha]] and `[[Inline]]`\n```md\n[[Fence]]\n```\n[[Beta]]';
    expect(extractLinks(content)).toEqual(['Alpha', 'Beta']);
  });

  it('resolves posts by id, title, and alias without case sensitivity', () => {
    const posts = [makePost()];
    expect(resolveLink('ALPHA', posts)?.id).toBe('alpha');
    expect(resolveLink('alpha post', posts)?.id).toBe('alpha');
    expect(resolveLink(' first ', posts)?.id).toBe('alpha');
  });

  it('returns backlinks while excluding the post itself', () => {
    const target = makePost({ content: '[[Alpha Post]]' });
    const referring = makePost({ id: 'beta', title: 'Beta', aliases: [], content: 'See [[First]]' });
    const unrelated = makePost({ id: 'gamma', title: 'Gamma', aliases: [], content: 'No link' });
    expect(getBacklinks(target, [target, referring, unrelated]).map((post) => post.id)).toEqual(['beta']);
  });

  it('converts wiki links while preserving code', () => {
    const content = 'Open [[Alpha Post]] and `[[Inline]]`.\n```md\n[[Fence]]\n```';
    expect(wikiLinksToMarkdown(content)).toBe('Open [Alpha Post](wiki:Alpha%20Post) and `[[Inline]]`.\n```md\n[[Fence]]\n```');
  });
});
