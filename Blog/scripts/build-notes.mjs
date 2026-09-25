import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PROFILE = {
  contentDir: process.env.BLOG_CONTENT_ROOT || '../Opus/posts',
  urlBase: '/blog',
  emitLatest: true,
  feed: {
    origin: process.env.BLOG_SITE_ORIGIN || 'https://moqian.me',
    title: '墨浅博文',
    description: '于浅墨之间，写一点不急的字。个人随笔与技术札记的存放处。',
    language: 'zh-CN',
    max: 20,
  },
};

const OPUS_POSTS = resolve(ROOT, PROFILE.contentDir);
const OUT_POSTS = resolve(ROOT, 'src/generated/posts.json');
const OUT_PUBLIC_POSTS = resolve(ROOT, 'public/posts');
const OUT_LATEST = resolve(ROOT, 'public/latest.json');
const OUT_RSS = resolve(ROOT, 'public/rss.xml');

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
  const self = `${feed.origin}${feedPath}`;
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
    console.warn(`[build-notes] Opus/posts not found at ${OPUS_POSTS}`);
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

/**
 * 解析 frontmatter 的 `cover` 字段。封面图必须与 index.md 同目录（page bundle 内），
 * 因为只有这一层的图片会被 copyBundleImages 复制到 public/posts/<slug>/。
 * 外部 URL 与站内绝对路径原样透传；找不到的文件只告警不阻断构建。
 */
function resolveCover(value, slug, bundleDir) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//.test(raw) || raw.startsWith('/')) return raw;
  const file = raw.replace(/^\.\//, '');
  if (!bundleDir || file.includes('/')) {
    console.warn(`[build-notes] cover 必须是 page bundle 内的同级图片，已忽略: "${slug}" cover="${value}"`);
    return '';
  }
  if (!existsSync(join(bundleDir, file))) {
    console.warn(`[build-notes] cover 文件不存在，已忽略: "${slug}" cover="${value}"`);
    return '';
  }
  return `${PROFILE.urlBase}/posts/${slug}/${file}`;
}

function rewriteImagePaths(body, slug, bundleDir) {
  if (!bundleDir) return body;
  // ![alt](./xxx.png) → ![alt](<urlBase>/posts/<slug>/xxx.png)  (urlBase: /blog for blog, '' for note)
  return body.replace(/!\[([^\]]*)\]\(\.\/([^)]+)\)/g, (_m, alt, path) => `![${alt}](${PROFILE.urlBase}/posts/${slug}/${path})`);
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

function toTimestamp(value) {
  const parsed = parseDate(value);
  return parsed.ok ? parsed.ts : Date.now();
}

function build() {
  console.log(`[build-notes] content=${relative(ROOT, OPUS_POSTS)}  urlBase="/blog"`);
  const posts = walkPosts();
  const generatedPosts = [];
  const datedIds = new Set(); // notes with an explicit frontmatter `date` — only these feed Home's latest.json

  // Slug 是公开 URL、React key、wiki-link、graph 节点和 public/posts/<slug> 资源目录的
  // 全局唯一标识。不同分类下的同名 bundle/文件会产生冲突，必须失败得早。
  const slugMap = new Map();
  for (const { slug, file } of posts) {
    if (slugMap.has(slug)) {
      const first = relative(OPUS_POSTS, slugMap.get(slug));
      const second = relative(OPUS_POSTS, file);
      throw new Error(
        `[build-notes] 检测到重复 slug "${slug}":\n  - ${first}\n  - ${second}\n` +
          `请重命名其中一个文件夹或文件，slug 不能重复。`
      );
    }
    slugMap.set(slug, file);
  }

  // Clear public/posts before regenerating
  if (existsSync(OUT_PUBLIC_POSTS)) rmSync(OUT_PUBLIC_POSTS, { recursive: true, force: true });

  for (const { slug, file, bundleDir, folderCategory } of posts) {
    const raw = readFileSync(file, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    if (data.draft === true) {
      console.log(`[build-notes] skip draft: ${slug}`);
      continue;
    }
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
    if (!title) title = slug;

    // Normalize multi-line $$...$$ blocks (Obsidian-style) into fenced-flow form
    // so remark-math doesn't mis-pair the fences and KaTeX doesn't paint the
    // rest of the note as red error text. Must run AFTER title lifting so the
    // H1 detection sees the original body shape.
    bodyOut = normalizeDisplayMath(bodyOut);

    // 只有成功解析的显式日期才允许进入 Home 的 latest.json 列表；
    // 缺少 date 是正常的（排序用 Date.now()），但写了无效日期必须告警。
    const dateResult = parseDate(data.date);
    const updatedResult = parseDate(data.updated);
    if (dateResult.ok) {
      datedIds.add(slug);
    } else if (data.date) {
      console.warn(`[build-notes] 跳过无效日期，不加入 latest.json: "${slug}" date="${data.date}"`);
    }

    const created = dateResult.ok ? dateResult.ts : Date.now();
    // updated 缺省或无效时回退到 date；date 也无效时再用 Date.now() 兜底。
    const updated = updatedResult.ok
      ? updatedResult.ts
      : (dateResult.ok ? dateResult.ts : Date.now());
    generatedPosts.push({
      id: slug,
      title,
      content: bodyOut.trim(),
      tags: Array.isArray(data.tags) ? data.tags : [],
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
      source: '',
      category: data.category || folderCategory || '',
      summary: data.summary || '',
      cover: resolveCover(data.cover, slug, bundleDir),
      createdAt: created,
      updatedAt: updated,
    });
    console.log(`[build-notes] ${slug}  (${data.category || folderCategory || '-'}, ${(data.tags || []).join('/')}${imgCopied ? `, +${imgCopied} img` : ''})`);
  }

  // Sort by updatedAt desc, stable
  generatedPosts.sort((a, b) => b.updatedAt - a.updatedAt);

  mkdirSync(dirname(OUT_POSTS), { recursive: true });
  writeFileSync(OUT_POSTS, JSON.stringify(generatedPosts, null, 2), 'utf8');
  console.log(`[build-notes] wrote ${generatedPosts.length} posts → ${relative(ROOT, OUT_POSTS)}`);

  if (PROFILE.emitLatest) {
    // Lands at /blog/latest.json in both dev (vite serve) and prod (vite copies public/* into dist/).
    const latest = generatedPosts.filter((post) => datedIds.has(post.id)).slice(0, 3).map((post) => ({
      title: post.title,
      url: `${PROFILE.urlBase}/post/${post.id}`,
      dateISO: new Date(post.updatedAt).toISOString().slice(0, 10),
      dateLabel: new Date(post.updatedAt).toISOString().slice(0, 10).replace(/-/g, '.'),
      category: post.category,
      tags: post.tags,
      excerpt: post.summary,
    }));
    mkdirSync(dirname(OUT_LATEST), { recursive: true });
    writeFileSync(OUT_LATEST, JSON.stringify(latest, null, 2), 'utf8');
    console.log(`[build-notes] wrote latest.json → ${relative(ROOT, OUT_LATEST)}`);
  }

  const feedItems = generatedPosts.slice(0, PROFILE.feed.max).map((post) => ({
    title: post.title,
    path: `${PROFILE.urlBase}/post/${post.id}`,
    timestamp: post.updatedAt,
    category: post.category,
    description: post.summary || plainExcerpt(post.content),
  }));
  mkdirSync(dirname(OUT_RSS), { recursive: true });
  writeFileSync(OUT_RSS, buildRss({
    items: feedItems,
    feed: PROFILE.feed,
    urlBase: PROFILE.urlBase,
    feedPath: `${PROFILE.urlBase}/rss.xml`,
  }), 'utf8');
  console.log(`[build-notes] wrote ${feedItems.length} items → ${relative(ROOT, OUT_RSS)}`);
}

build();
