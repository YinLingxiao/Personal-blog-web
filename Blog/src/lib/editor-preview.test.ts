import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PostReader from '../components/PostReader';
import { normalizeDisplayMath } from '../../../shared/content/display-math.mjs';
import { wikiLinksToMarkdown } from '../utils/linkParser';
import { findSourceBlock, prepareEditorPreview, sourceRange } from './editor-preview';

describe('editor preview source locations', () => {
  const samples = [
    '', '\n\n## 标题\n\n\n段落\n\n',
    '前文 $x$\n\n$$  x^2  $$\n\n\n后文 [[中文别名]]',
    '```md\n$$保留$$\n[[保留]]\n```\n`$$保留$$`\n~~~md\n$$保留$$\n~~~',
    '> 引用\n> $$x^2$$\n\n| a | b |\n| --- | --- |\n| $x$ | [[链接]] |',
    '重复内容\n\n$$x$$\n\n重复内容\n\n$$x$$\n\n重复内容',
    '😀 中文段落\n\n- 列表\n  - 内层\n\n![配图](./大图.png)\n',
  ];
  it.each(samples)('matches existing rendering transforms for %j', (raw) => {
    const document = prepareEditorPreview(raw);
    expect(document.markdown).toBe(wikiLinksToMarkdown(normalizeDisplayMath(raw)));
    expect(document.offsets).toHaveLength(document.markdown.length + 1);
    expect(document.offsets.every((offset, index) => offset >= 0 && offset <= raw.length && (!index || offset >= document.offsets[index - 1]))).toBe(true);
  });
  it('keeps exact later offsets after expanded formula and wiki link transforms', () => {
    const raw = '\n[[中文😀别名]]\n\n$$ x^2 $$\n\n\n## 后面的标题\n\n第二段\n\n第二段';
    const document = prepareEditorPreview(raw);
    for (const label of ['## 后面的标题', '第二段']) {
      const start = document.markdown.indexOf(label);
      expect(sourceRange(document, start, start + label.length)).toEqual({ from: raw.indexOf(label), to: raw.indexOf(label) + label.length });
    }
    const start = document.markdown.lastIndexOf('第二段');
    expect(sourceRange(document, start, start + 3)).toEqual({ from: raw.lastIndexOf('第二段'), to: raw.length });
  });
  it('maps lifted H1 to the preview title and retains original body offsets', () => {
    const raw = '\n\n# 源码标题\n\n\n正文段落';
    const document = prepareEditorPreview(raw, true);
    expect(document.titleRange).toEqual({ from: raw.indexOf('#'), to: raw.indexOf('\n', raw.indexOf('#')) });
    expect(document.markdown).toBe('正文段落');
    expect(sourceRange(document, 0, document.markdown.length)).toEqual({ from: raw.indexOf('正文段落'), to: raw.length });
    expect(prepareEditorPreview(raw).titleRange).toBeUndefined();
  });
  it('selects the smallest containing block and resolves blank lines forwards, then backwards at EOF', () => {
    const blocks = [{ from: 0, to: 20 }, { from: 3, to: 8 }, { from: 25, to: 30 }];
    expect(findSourceBlock(blocks, 4)).toBe(blocks[1]);
    expect(findSourceBlock(blocks, 8)).toBe(blocks[1]);
    expect(findSourceBlock(blocks, 10, true)).toBe(blocks[2]);
    expect(findSourceBlock(blocks, 22)).toBe(blocks[2]);
    expect(findSourceBlock(blocks, 40)).toBe(blocks[2]);
    expect(findSourceBlock([], 0)).toBeUndefined();
  });
  it('retains source ranges through KaTeX, table wrappers and repeated paragraphs; public rendering is unmarked', () => {
    const raw = '重复段落\n\n$$x^2$$\n\n| 甲 | 乙 |\n| --- | --- |\n| 中文 | $x$ |\n\n```ts\nconst x = 1;\n```\n\n重复段落';
    const post = { id: 'test', title: 'Test', content: raw, tags: [], createdAt: 0, updatedAt: 0 };
    const mapped = renderToStaticMarkup(createElement(PostReader, { post, allPosts: [post], onNavigate: () => {}, preview: true, sourceDocument: prepareEditorPreview(raw) }));
    for (const text of ['重复段落', '$$x^2$$', '| 甲 |', '```ts']) expect(mapped).toContain(`data-source-from="${raw.indexOf(text)}"`);
    expect(mapped).toContain(`data-source-from="${raw.lastIndexOf('重复段落')}"`);
    expect(mapped).toContain('katex-display');
    expect(mapped).toMatch(/<table[^>]*data-source-from/);
    expect(mapped).toMatch(/<tr[^>]*data-source-from/);
    const publicHtml = renderToStaticMarkup(createElement(PostReader, { post, allPosts: [post], onNavigate: () => {} }));
    expect(publicHtml).not.toContain('data-source-from');
  });
});
