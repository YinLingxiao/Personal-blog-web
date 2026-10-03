import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PROFILE = {
  contentDir: process.env.NOTE_CONTENT_ROOT || '../Notes',
  urlBase: '',
  feed: {
    origin: process.env.NOTE_SITE_ORIGIN || 'https://note.moqian.me',
    title: '墨浅笔记',
    description: '案头随手的笔记与札记，未必成文，但都在生长。',
    language: 'zh-CN',
    max: 20,
  },
};

const OPUS_POSTS = resolve(ROOT, PROFILE.contentDir);
const RUNTIME_OUTPUT = process.env.NOTE_OUTPUT_ROOT ? resolve(process.env.NOTE_OUTPUT_ROOT) : null;
const ASSET_BASE = process.env.NOTE_ASSET_BASE || PROFILE.urlBase;
const OUT_NOTES = RUNTIME_OUTPUT ? join(RUNTIME_OUTPUT, 'index.json') : resolve(ROOT, 'src/generated/notes.json');
const OUT_PUBLIC_POSTS = RUNTIME_OUTPUT ? join(RUNTIME_OUTPUT, 'posts') : resolve(ROOT, 'public/posts');
const OUT_RSS = RUNTIME_OUTPUT ? join(RUNTIME_OUTPUT, 'rss.xml') : resolve(ROOT, 'public/rss.xml');
const OUT_IDENTIFIERS = RUNTIME_OUTPUT ? join(RUNTIME_OUTPUT, 'identifiers.json') : resolve(ROOT, 'src/generated/note-identifiers.json');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Markdown 摘要仅用于 RSS description：去掉代码块、公式、图片与行内标记，保留可读句子。
function plainExcerpt(markdown, limit = 220) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function buildRss({ items, feed, urlBase, feedPath }) {
  const site = `${feed.origin}${urlBase}/`;
  const self = process.env.NOTE_RSS_SELF || `${feed.origin}${feedPath}`;
  const entries = items.map((item) => {
    const link = `${feed.origin}${item.path}`;
    const category = item.category ? `\n      <category>${escapeXml(item.category)}</category>` : '';
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(item.timestamp).toUTCString()}</pubDate>${category}
      <description>${escapeXml(item.description)}</description>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(site)}</link>
    <description>${escapeXml(feed.description)}</description>
    <language>${escapeXml(feed.language)}</language>
    <lastBuildDate>${new Date(items[0]?.timestamp ?? Date.now()).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />
${entries.join('\n')}
  </channel>
</rss>
`;
}

function parseFrontmatter(raw) {
  raw = raw.replace(/\r\n?/g, '\n'); // normalize CRLF/CR → LF (Obsidian on Windows often saves CRLF)
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };
  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, '');
  const data = {};
  const lines = yaml.split('\n');
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if (val === '') {
      // Obsidian multi-line list:  key:\n  - a\n  - b
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        items.push(unquote(lines[j].replace(/^\s*-\s+/, '')));
        j++;
      }
      if (items.length) {
        data[key] = items.filter(Boolean);
        i = j - 1;
      } else {
        data[key] = '';
      }
    } else if (val.startsWith('[') && val.endsWith(']')) {
      data[key] = val.slice(1, -1).split(',').map(unquote).filter(Boolean);
    } else {
      // 忽略 YAML 行内注释，并对布尔字面量做大小写无关识别，
      // 这样 draft: true # 备注 和 draft: True 都能被正确识别。
      const scalar = val.replace(/#.*$/, '').trim();
      if (/^true$/i.test(scalar)) data[key] = true;
      else if (/^false$/i.test(scalar)) data[key] = false;
      else data[key] = unquote(val);
    }
  }
  return { data, body };
}

function walkPosts() {
  const out = [];
  if (!existsSync(OPUS_POSTS)) {
    console.warn(`[build-notes] Notes content not found at ${OPUS_POSTS}`);
    return out;
  }
  scanDir(OPUS_POSTS, null, out);
  return out;
}

/**
 * Scan one level of folders. A folder containing index.md is a page bundle
 * (slug = folder name). A folder WITHOUT index.md (only at the top level) is a
 * "category folder": its name becomes the category for the *.md and page bundles
 * inside it ("文件夹即分类"). Frontmatter `category` still overrides.
 */
const META_MD = new Set(['claude.md', 'readme.md']); // repo/vault docs, never content

function scanDir(dir, folderCategory, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // skip .obsidian, etc.
    if (entry.isFile() && META_MD.has(entry.name.toLowerCase())) continue; // skip CLAUDE.md/README.md
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const indexPath = join(full, 'index.md');
      if (existsSync(indexPath)) {
        out.push({ slug: entry.name, file: indexPath, bundleDir: full, folderCategory });
      } else if (folderCategory === null) {
        scanDir(full, entry.name, out); // one level deep: treat as a category folder
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push({ slug: basename(entry.name, '.md'), file: full, bundleDir: null, folderCategory });
    }
  }
}

function copyBundleImages(slug, bundleDir) {
  if (!bundleDir) return;
  const dest = join(OUT_PUBLIC_POSTS, slug);
  let copied = 0;
  for (const f of readdirSync(bundleDir)) {
    if (f === 'index.md') continue;
    const src = join(bundleDir, f);
    if (!statSync(src).isFile()) continue;
    const ext = extname(f).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'].includes(ext)) continue;
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    copyFileSync(src, join(dest, f));
    copied++;
  }
  return copied;
}

function rewriteImagePaths(body, slug, bundleDir) {
  if (!bundleDir) return body;
  // ![alt](./xxx.png) → ![alt](/posts/<slug>/xxx.png)
  return body.replace(/!\[([^\]]*)\]\(\.\/([^)]+)\)/g, (_m, alt, path) => `![${alt}](${ASSET_BASE}/posts/${encodeURIComponent(slug)}/${encodeURIComponent(path)})`);
}

/**
 * Obsidian renders any $$...$$ as display math, including multi-line blocks like
 *   $$0\le y\le 1,
 *   \qquad ... 2-y$$
 * but remark-math mis-parses that form (content sitting on the opening `$$` fence
 * line, no blank line before) — it orphans the closing `$$`, mispairs every later
 * `$$`, and KaTeX then renders the rest of the note as red error text.
 * Normalize every display block to the robust fenced-flow form:
 *   \n\n$$\n<inner>\n$$\n\n
 * Fenced + inline code are masked first so we never rewrite `$$` inside code.
 */
function normalizeDisplayMath(body) {
  const stash = [];
  const protect = (s) => { stash.push(s); return `${stash.length - 1}`; };
  let out = body
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, protect) // fenced code
    .replace(/`[^`\n]*`/g, protect);                    // inline code
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => `\n\n$$\n${inner.trim()}\n$$\n\n`);
  out = out.replace(/\n{3,}/g, '\n\n');
  out = out.replace(/(\d+)/g, (_m, i) => stash[Number(i)]);
  return out.trim();
}

/**
 * 严格校验 `YYYY-MM-DD` 日期字符串。
 * 不使用 `new Date(value)` 的宽松解析，避免把 `2026-02-30` 自动归一化。
 * 返回 { ok: true, ts } 或 { ok: false, reason }，便于区分"缺日期"和"日期无效"。
 */
function parseDate(value) {
  if (!value) return { ok: false, reason: 'missing' };
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return { ok: false, reason: 'format' };
  const y = Number(m[1]);
  const mon = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mon - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== mon ||
    date.getUTCDate() !== d
  ) {
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, ts: date.getTime() };
}

function build() {
  console.log(`[build-notes] content=${relative(ROOT, OPUS_POSTS)}  urlBase="/"`);
  const posts = walkPosts().map((post) => ({
    ...post,
    ...parseFrontmatter(readFileSync(post.file, 'utf8')),
    sourcePath: relative(OPUS_POSTS, post.file).replace(/\\/g, '/'),
  })).filter((post) => post.data.draft !== true);
  const notes = [];

  const previousRoot = process.env.NOTE_PREVIOUS_OUTPUT;
  const registryPath = previousRoot ? join(previousRoot, 'identifiers.json') : OUT_IDENTIFIERS;
  const previousIndex = previousRoot ? join(previousRoot, 'index.json') : OUT_NOTES;
  const identifiers = new Map(existsSync(registryPath)
    ? Object.entries(JSON.parse(readFileSync(registryPath, 'utf8')))
    : []);
  if (!existsSync(registryPath) && existsSync(previousIndex)) {
    const previousNotes = JSON.parse(readFileSync(previousIndex, 'utf8'));
    for (const post of posts) {
      const category = post.data.category || post.folderCategory || '';
      const previous = previousNotes.find((note) => note.id === `${post.folderCategory}--${post.slug}`)
        || previousNotes.find((note) => note.id === post.slug && note.category === category);
      if (previous) identifiers.set(post.sourcePath, previous.id);
    }
  }
  const owners = new Map();
  for (const [sourcePath, slug] of identifiers) {
    if (typeof slug !== 'string' || owners.has(slug)) throw new Error('[build-notes] 笔记标识记录无效或重复');
    owners.set(slug, sourcePath);
  }
  const slugCounts = new Map();
  for (const { slug } of posts) slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  const resolvedPosts = posts.map((post) => {
    let slug = identifiers.get(post.sourcePath);
    if (!slug) {
      slug = (slugCounts.get(post.slug) > 1 || owners.has(post.slug)) && post.folderCategory
        ? `${post.folderCategory}--${post.slug}`
        : post.slug;
      if (owners.has(slug)) throw new Error(`[build-notes] 笔记标识已被占用: ${slug}，请重命名文件或文件夹`);
      identifiers.set(post.sourcePath, slug);
      owners.set(slug, post.sourcePath);
    }
    return { ...post, baseSlug: post.slug, slug };
  });
  const slugMap = new Map();
  for (const { slug, file } of resolvedPosts) {
    if (slugMap.has(slug)) {
      const first = relative(OPUS_POSTS, slugMap.get(slug));
      const second = relative(OPUS_POSTS, file);
      throw new Error(
        `[build-notes] 检测到重复 slug "${slug}":\n  - ${first}\n  - ${second}\n` +
          `请重命名其中一个文件夹或文件，生成的 slug 不能重复。`
      );
    }
    slugMap.set(slug, file);
  }

  // Clear public/posts before regenerating
  if (existsSync(OUT_PUBLIC_POSTS)) rmSync(OUT_PUBLIC_POSTS, { recursive: true, force: true });

  for (const { slug, baseSlug, file, bundleDir, folderCategory, data, body } of resolvedPosts) {
    const imgCopied = copyBundleImages(slug, bundleDir);
    let bodyOut = rewriteImagePaths(body, slug, bundleDir);

    // Obsidian-style title fallback: frontmatter title → leading H1 → filename.
    // When the leading line is an H1 and there's no frontmatter title, lift it
    // out as the title so it isn't rendered twice (page title + body heading).
    let title = data.title;
    if (!title) {
      const trimmed = bodyOut.replace(/^\n+/, '');
      if (trimmed.startsWith('# ')) {
        const nl = trimmed.indexOf('\n');
        title = trimmed.slice(2, nl === -1 ? undefined : nl).trim();
        bodyOut = (nl === -1 ? '' : trimmed.slice(nl + 1)).replace(/^\n+/, '');
      }
    }
    if (!title) title = baseSlug;

    // Normalize multi-line $$...$$ blocks (Obsidian-style) into fenced-flow form
    // so remark-math doesn't mis-pair the fences and KaTeX doesn't paint the
    // rest of the note as red error text. Must run AFTER title lifting so the
    // H1 detection sees the original body shape.
    bodyOut = normalizeDisplayMath(bodyOut);

    const dateResult = parseDate(data.date);
    const updatedResult = parseDate(data.updated);
    if (!dateResult.ok && data.date) {
      console.warn(`[build-notes] 无效日期: "${slug}" date="${data.date}"`);
    }

    const fileModified = Math.trunc(statSync(file).mtimeMs);
    const created = dateResult.ok ? dateResult.ts : fileModified;
    const updated = updatedResult.ok
      ? updatedResult.ts
      : (dateResult.ok ? dateResult.ts : fileModified);
    notes.push({
      id: slug,
      sourceSlug: baseSlug,
      title,
      content: bodyOut.trim(),
      tags: Array.isArray(data.tags) ? data.tags : [],
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
      source: '',
      category: data.category || folderCategory || '',
      summary: data.summary || '',
      createdAt: created,
      updatedAt: updated,
    });
    console.log(`[build-notes] ${slug}  (${data.category || folderCategory || '-'}, ${(data.tags || []).join('/')}${imgCopied ? `, +${imgCopied} img` : ''})`);
  }

  // Sort by updatedAt desc, stable
  notes.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));

  mkdirSync(dirname(OUT_NOTES), { recursive: true });
  writeFileSync(OUT_NOTES, JSON.stringify(notes, null, 2), 'utf8');
  console.log(`[build-notes] wrote ${notes.length} notes → ${relative(ROOT, OUT_NOTES)}`);

  if (RUNTIME_OUTPUT) {
    const counts = new Map();
    notes.forEach((note) => {
      const category = (note.category || '').trim();
      if (category) counts.set(category, (counts.get(category) || 0) + 1);
    });
    const items = notes.slice(0, 5).map((note) => {
      const [subject, ...rest] = String(note.title).split(/\s*—{2,}\s*/);
      return {
        id: note.id,
        title: subject.trim() || note.title,
        kind: rest.join(' ').trim(),
        category: (note.category || '').trim(),
        tags: note.tags.slice(0, 3),
      };
    });
    writeFileSync(join(RUNTIME_OUTPUT, 'latest.json'), JSON.stringify({
      total: notes.length,
      categories: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh')).slice(0, 6).map(([name, count]) => ({ name, count })),
      items,
    }, null, 2), 'utf8');
  }

  const feedItems = notes.slice(0, PROFILE.feed.max).map((note) => ({
    title: note.title,
    path: `/post/${encodeURIComponent(note.id)}`,
    timestamp: note.updatedAt,
    category: note.category,
    description: note.summary || plainExcerpt(note.content),
  }));
  mkdirSync(dirname(OUT_RSS), { recursive: true });
  writeFileSync(OUT_RSS, buildRss({
    items: feedItems,
    feed: PROFILE.feed,
    urlBase: PROFILE.urlBase,
    feedPath: RUNTIME_OUTPUT ? '/api/content/note/rss.xml' : '/rss.xml',
  }), 'utf8');
  console.log(`[build-notes] wrote ${feedItems.length} items → ${relative(ROOT, OUT_RSS)}`);
  writeFileSync(OUT_IDENTIFIERS, JSON.stringify(Object.fromEntries([...identifiers].sort(([a], [b]) => a.localeCompare(b))), null, 2), 'utf8');
}

build();
