import { describe, expect, it } from 'vitest';
import { editorFields, imageChanges, parseMarkdown, serializeMarkdown } from './blog-editor';
import { normalizeDisplayMath } from '../../../shared/content/display-math.mjs';

describe('blog editor source round trip', () => {
  it('preserves aliases, nested unknown fields, dates, quoted strings and local image references', () => {
    const original = '---\r\ntitle: "Old # title"\r\ndate: 2026-09-01\r\nupdated: 2026-09-02\r\naliases:\r\n  - Alias\r\ncustom:\r\n  nested: [one, two]\r\nsummary: |\r\n  A summary\r\n  on two lines\r\n---\r\n![image](./a.png)\r\n';
    const fields = editorFields(original, '随笔');
    fields.title = 'New "quoted" title # literal';
    fields.body += 'More body';
    const { metadata, body } = parseMarkdown(serializeMarkdown(original, fields));
    expect(metadata).toMatchObject({ title: fields.title, date: '2026-09-01', updated: '2026-09-02', aliases: ['Alias'], custom: { nested: ['one', 'two'] }, summary: 'A summary\non two lines\n' });
    expect(body).toContain('![image](./a.png)');
  });
  it('supports raw notes and does not invent dates', () => {
    const fields = editorFields('# Title\nBody', '技术');
    const result = parseMarkdown(serializeMarkdown('# Title\nBody', fields));
    expect(result.metadata.date).toBeUndefined();
    expect(result.metadata.updated).toBeUndefined();
    expect(result.body).toBe('# Title\nBody');
  });
  it('accepts empty frontmatter and does not treat a horizontal rule in the body as frontmatter', () => {
    expect(parseMarkdown('---\n---\n# Title').body).toBe('# Title');
    expect(parseMarkdown('Body\n---\nsection\n---\nTail').body).toBe('Body\n---\nsection\n---\nTail');
    expect(parseMarkdown('---\ntitle: Hello---world\n---\nBody').metadata.title).toBe('Hello---world');
  });
  it('reports added, removed and same-name replaced images', async () => {
    const result = await imageChanges([{ name: 'index.md', hash: '' }, { name: 'old.png', hash: 'old' }, { name: 'cover.png', hash: 'before' }], [new File(['new'], 'cover.png'), new File(['added'], 'new.png')]);
    expect(result).toEqual({ added: ['new.png'], removed: ['old.png'], replaced: ['cover.png'] });
  });
  it('uses the build math normalization and preserves code examples', () => {
    const raw = '$$x^2$$\n`$$literal$$`\n```md\n$$example$$\n```';
    const normalized = normalizeDisplayMath(raw);
    expect(normalized).toContain('$$\nx^2\n$$');
    expect(normalized).toContain('`$$literal$$`');
    expect(normalized).toContain('```md\n$$example$$\n```');
  });
});
