import type { Element, Root, RootContent } from 'hast';

export interface SourceRange { from: number; to: number }
export interface EditorPreviewDocument {
  markdown: string;
  offsets: number[];
  titleRange?: SourceRange;
}

type Mapped = { text: string; offsets: number[] };

function slice(value: Mapped, from: number, to = value.text.length): Mapped {
  return { text: value.text.slice(from, to), offsets: value.offsets.slice(from, to + 1) };
}

function literal(text: string, from: number, to = from): Mapped {
  return { text, offsets: Array.from({ length: text.length + 1 }, (_, index) => from + Math.floor((to - from) * index / Math.max(1, text.length))) };
}

function join(parts: Mapped[], fallback: number): Mapped {
  const offsets: number[] = [];
  for (const part of parts) for (let index = 0; index < part.text.length; index++) offsets.push(part.offsets[index]);
  offsets.push(parts.at(-1)?.offsets.at(-1) ?? fallback);
  return { text: parts.map((part) => part.text).join(''), offsets };
}

function replace(value: Mapped, pattern: RegExp, transform: (match: RegExpExecArray, part: Mapped) => Mapped): Mapped {
  const parts: Mapped[] = [];
  let cursor = 0;
  for (const match of value.text.matchAll(pattern)) {
    const at = match.index;
    parts.push(slice(value, cursor, at), transform(match, slice(value, at, at + match[0].length)));
    cursor = at + match[0].length;
  }
  parts.push(slice(value, cursor));
  return join(parts, value.offsets[0]);
}

function trim(value: Mapped): Mapped {
  const start = value.text.length - value.text.trimStart().length;
  const end = value.text.trimEnd().length;
  return slice(value, start, Math.max(start, end));
}

export function prepareEditorPreview(raw: string, liftTitle = false): EditorPreviewDocument {
  let value: Mapped = { text: raw, offsets: Array.from({ length: raw.length + 1 }, (_, index) => index) };
  let titleRange: SourceRange | undefined;
  const title = liftTitle ? /^\n*# [^\n]*(?:\n|$)\n*/.exec(raw) : null;
  if (title) {
    const from = raw.indexOf('#');
    titleRange = { from, to: raw.indexOf('\n', from) < 0 ? raw.length : raw.indexOf('\n', from) };
    value = slice(value, title[0].length);
  }
  const stash: Mapped[] = [];
  const protect = (_match: RegExpExecArray, part: Mapped) => {
    stash.push(part);
    return literal(`\uE000${stash.length - 1}\uE001`, part.offsets[0], part.offsets.at(-1));
  };
  value = replace(value, /```[\s\S]*?```|~~~[\s\S]*?~~~/g, protect);
  value = replace(value, /`[^`\n]*`/g, protect);
  value = replace(value, /\$\$([\s\S]*?)\$\$/g, (_match, part) => {
    const inner = trim(slice(part, 2, part.text.length - 2));
    return join([
      literal('\n\n', part.offsets[0]), slice(part, 0, 2), literal('\n', inner.offsets[0]), inner,
      literal('\n', part.offsets[part.text.length - 2]), slice(part, part.text.length - 2), literal('\n\n', part.offsets.at(-1)!),
    ], part.offsets[0]);
  });
  value = replace(value, /\n{3,}/g, (_match, part) => literal('\n\n', part.offsets[0], part.offsets.at(-1)));
  value = replace(value, /\uE000(\d+)\uE001/g, (match) => stash[Number(match[1])]);
  value = trim(value);
  value = replace(value, /(```[\s\S]*?```|`[^`]*`)|(\[\[([^\]]+)\]\])/g, (match, part) => match[1] ? part : literal(`[${match[3]}](wiki:${encodeURIComponent(match[3])})`, part.offsets[0], part.offsets.at(-1)));
  return { markdown: value.text, offsets: value.offsets, titleRange };
}

export function sourceRange(document: EditorPreviewDocument, from: number, to: number): SourceRange {
  return { from: document.offsets[from] ?? 0, to: document.offsets[to] ?? document.offsets.at(-1) ?? 0 };
}

export function rangeAttributes(range?: SourceRange) {
  return range ? { 'data-source-from': range.from, 'data-source-to': range.to } : {};
}

export function findSourceBlock<T extends SourceRange>(blocks: T[], position: number, blankLine = false): T | undefined {
  const containing = blocks.filter((block) => block.from <= position && position <= block.to);
  if (!blankLine && containing.length) return containing.reduce((a, b) => a.to - a.from <= b.to - b.from ? a : b);
  return blocks.filter((block) => block.from >= position).sort((a, b) => a.from - b.from || a.to - b.to)[0]
    ?? blocks.filter((block) => block.to <= position).sort((a, b) => b.to - a.to || a.to - a.from - (b.to - b.from))[0];
}

export function editorSourcePositions(document: EditorPreviewDocument) {
  return () => (tree: Root) => {
    const visit = (parent: Root | Element) => {
      parent.children = parent.children.map((child): RootContent => {
        if (child.type !== 'element') return child;
        const classes = child.properties.className;
        const math = child.tagName === 'pre' && child.children.some((node) => node.type === 'element' && Array.isArray(node.properties.className) && node.properties.className.includes('language-math'))
          || Array.isArray(classes) && classes.includes('math-display');
        const range = child.position?.start.offset !== undefined && child.position.end.offset !== undefined
          ? sourceRange(document, child.position.start.offset, child.position.end.offset) : undefined;
        if (range && math) return { type: 'element', tagName: 'div', properties: rangeAttributes(range), children: [child] };
        if (range && /^(h[1-6]|p|li|blockquote|pre|table|tr|hr)$/.test(child.tagName)) Object.assign(child.properties, rangeAttributes(range));
        visit(child);
        return child;
      });
    };
    visit(tree);
  };
}
