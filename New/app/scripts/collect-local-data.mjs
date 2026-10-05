// 汇总同仓库其他项目的构建产物，供 Home 的 Étude / Ballade 区使用。
// 构建期运行、best-effort：源文件缺失时保留上一份产物，不阻断构建。
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNoteCatalog } from '../../../shared/content/note-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const PUBLIC_DIR = resolve(__dirname, '../public');
const NOTES_SRC = resolve(REPO_ROOT, 'Note/src/generated/notes.json');
const NOTES_CATALOG_OUT = resolve(PUBLIC_DIR, 'notes-catalog.json');
const BLOG_CANDIDATES = [
  resolve(REPO_ROOT, 'Blog/public/latest.json'),
  resolve(REPO_ROOT, 'Blog/dist/latest.json'),
];
// 名字不能以 /blog 开头：dev server 把该前缀整段代理到博客端口，快照会被一起吞掉。
const BLOG_OUT = resolve(PUBLIC_DIR, 'writings-fallback.json');

function collectNotes() {
  if (!existsSync(NOTES_SRC)) {
    console.warn('[collect-local-data] Note/src/generated/notes.json 缺失，跳过 notes-catalog.json');
    return;
  }

  const notes = JSON.parse(readFileSync(NOTES_SRC, 'utf8'));
  if (!Array.isArray(notes)) throw new Error('notes.json 不是数组');
  if (!notes.length) {
    console.warn('[collect-local-data] 没有读到任何笔记（缺少 Notes/ 内容库？），保留既有 notes-catalog.json');
    return;
  }
  writeFileSync(NOTES_CATALOG_OUT, `${JSON.stringify(buildNoteCatalog(notes), null, 2)}\n`);

  console.log(`[collect-local-data] wrote note catalog (${notes.length} notes) to public/notes-catalog.json`);
}

function collectBlogFallback() {
  const source = BLOG_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!source) {
    console.warn('[collect-local-data] Blog latest.json 缺失，跳过 writings-fallback.json');
    return;
  }
  const latest = JSON.parse(readFileSync(source, 'utf8'));
  if (!Array.isArray(latest) || !latest.length) {
    console.warn('[collect-local-data] Blog latest.json 为空（缺少 Opus/posts 内容库？），保留既有 writings-fallback.json');
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
