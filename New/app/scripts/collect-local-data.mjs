// 汇总同仓库其他项目的构建产物，供 Home 的 Étude / Ballade 区使用。
// 构建期运行、best-effort：源文件缺失时保留上一份产物，不阻断构建。
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const PUBLIC_DIR = resolve(__dirname, '../public');
const NOTES_SRC = resolve(REPO_ROOT, 'Note/src/generated/notes.json');
const NOTES_OUT = resolve(PUBLIC_DIR, 'notes-latest.json');
const BLOG_CANDIDATES = [
  resolve(REPO_ROOT, 'Blog/public/latest.json'),
  resolve(REPO_ROOT, 'Blog/dist/latest.json'),
];
// 名字不能以 /blog 开头：dev server 把该前缀整段代理到博客端口，快照会被一起吞掉。
const BLOG_OUT = resolve(PUBLIC_DIR, 'writings-fallback.json');
const MAX_NOTES = 5;
const MAX_CATEGORIES = 6;

function collectNotes() {
  if (!existsSync(NOTES_SRC)) {
    console.warn('[collect-local-data] Note/src/generated/notes.json 缺失，跳过 notes-latest.json');
    return;
  }

  const notes = JSON.parse(readFileSync(NOTES_SRC, 'utf8'));
  if (!Array.isArray(notes)) throw new Error('notes.json 不是数组');

  const counts = new Map();
  notes.forEach((note) => {
    const category = (note?.category || '').trim();
    if (!category) return;
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  const items = [...notes]
    .filter((note) => note?.id && note?.title)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_NOTES)
    .map((note) => {
      // Obsidian 标题常写成「主题 —— 体裁」，拆开后主题走正文、体裁走 mono 元信息，避免整列重复后缀。
      const [subject, ...rest] = String(note.title).split(/\s*—{2,}\s*/);
      return {
        id: note.id,
        title: subject.trim() || String(note.title).trim(),
        kind: rest.join(' ').trim(),
        category: (note.category || '').trim(),
        tags: Array.isArray(note.tags) ? note.tags.slice(0, 3) : [],
      };
    });

  const payload = {
    total: notes.length,
    categories: [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
      .slice(0, MAX_CATEGORIES)
      .map(([name, count]) => ({ name, count })),
    items,
  };

  writeFileSync(NOTES_OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[collect-local-data] wrote ${items.length}/${notes.length} notes to public/notes-latest.json`);
}

function collectBlogFallback() {
  const source = BLOG_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!source) {
    console.warn('[collect-local-data] Blog latest.json 缺失，跳过 blog-latest-fallback.json');
    return;
  }
  copyFileSync(source, BLOG_OUT);
  console.log('[collect-local-data] wrote public/writings-fallback.json');
}

for (const task of [collectNotes, collectBlogFallback]) {
  try {
    task();
  } catch (error) {
    console.warn(`[collect-local-data] ${task.name} 失败（${error instanceof Error ? error.message : error}），保留既有产物`);
  }
}
