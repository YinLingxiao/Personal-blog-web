import { Document, isMap, parseDocument } from 'yaml';

export interface EditorFields {
  title: string;
  summary: string;
  tags: string;
  category: string;
  date: string;
  updated: string;
  cover: string;
  draft: boolean;
  body: string;
}

export function parseMarkdown(raw: string) {
  const normalized = raw.replace(/\r\n?/g, '\n');
  const match = /^---\n((?:[^\n]*\n)*?)---[ \t]*(?:\n|$)/.exec(normalized);
  const document = match?.[1].trim() ? parseDocument(match[1]) : new Document({});
  if (document.errors.length || !isMap(document.contents)) throw new Error('frontmatter 格式错误，请检查 YAML');
  const metadata = document.toJS({ maxAliasCount: 50 }) as Record<string, unknown>;
  return { document, metadata, body: match ? normalized.slice(match[0].length) : normalized };
}

export function editorFields(markdown: string, category: string): EditorFields {
  const { metadata, body } = parseMarkdown(markdown);
  return {
    title: String(metadata.title || ''), summary: String(metadata.summary || ''),
    tags: Array.isArray(metadata.tags) ? metadata.tags.join(', ') : '',
    category, date: String(metadata.date || ''), updated: String(metadata.updated || ''),
    cover: String(metadata.cover || ''), draft: metadata.draft === true, body,
  };
}

export function serializeMarkdown(original: string, fields: EditorFields) {
  const { document, metadata } = parseMarkdown(original);
  for (const key of ['title', 'summary', 'category', 'date', 'updated', 'cover'] as const) {
    const value = fields[key];
    if (String(metadata[key] || '') === value) continue;
    if (value) document.set(key, value);
    else document.delete(key);
  }
  const tags = fields.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
  if (JSON.stringify(metadata.tags || []) !== JSON.stringify(tags)) document.set('tags', tags);
  if ((metadata.draft === true) !== fields.draft) document.set('draft', fields.draft);
  return `---\n${document.toString()}---\n${fields.body}`;
}

export async function fileHash(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function imageChanges(old: Array<{ name: string; hash: string }>, files: File[]) {
  const images = files.filter((file) => file.name !== 'index.md');
  const hashes = new Map(await Promise.all(images.map(async (file) => [file.name, await fileHash(file)] as const)));
  const oldImages = old.filter((file) => file.name !== 'index.md');
  const names = new Set(oldImages.map((file) => file.name));
  return {
    added: images.filter((file) => !names.has(file.name)).map((file) => file.name),
    removed: oldImages.filter((file) => !hashes.has(file.name)).map((file) => file.name),
    replaced: oldImages.filter((file) => hashes.has(file.name) && hashes.get(file.name) !== file.hash).map((file) => file.name),
  };
}
