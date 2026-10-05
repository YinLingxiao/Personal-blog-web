import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { parse } from "yaml";
import { classifyFile, ContentValidationError, validateSegment } from "./policy.js";
import { ensureSafeRoot } from "./scan-content.js";

export function markdownMetadata(markdown: string) {
  const match = /^---\n((?:[^\n]*\n)*?)---[ \t]*(?:\n|$)/.exec(markdown.replace(/\r\n?/g, "\n"));
  if (!match) return {} as Record<string, unknown>;
  try {
    const data: unknown = parse(match[1], { maxAliasCount: 50 }) || {};
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new ContentValidationError("frontmatter 格式错误，请检查 YAML");
  }
}

export function safeDirectory(directory: string) {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new ContentValidationError("内容目录不安全");
  return directory;
}

export function hiddenDirectory(root: string, name: string) {
  const directory = path.join(root, name);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
  return safeDirectory(directory);
}

export function scanBlog(rootPath: string) {
  const root = ensureSafeRoot(rootPath);
  const entries: Array<{ slug: string; category: string; source: string; flat: boolean }> = [];
  function scan(directory: string, category: string, recurse: boolean) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || /^(readme|claude)\.md$/i.test(entry.name)) continue;
      if (entry.isSymbolicLink()) throw new ContentValidationError("内容库包含符号链接");
      const source = path.join(directory, entry.name);
      if (entry.isFile() && entry.name.endsWith(".md")) entries.push({ slug: entry.name.slice(0, -3), category, source, flat: true });
      if (entry.isDirectory()) {
        safeDirectory(source);
        if (fs.existsSync(path.join(source, "index.md"))) entries.push({ slug: entry.name, category, source, flat: false });
        else if (recurse) scan(source, entry.name, false);
      }
    }
  }
  scan(root, "", true);
  return entries;
}

export function locateBlog(root: string, slug: string) {
  validateSegment(slug, "category");
  const entries = scanBlog(root).filter((entry) => entry.slug === slug);
  if (!entries.length) throw new ContentValidationError("博文不存在", 404, "CONTENT_NOT_FOUND");
  if (entries.length !== 1) throw new ContentValidationError("存在重复 slug，请先整理内容库", 409, "AMBIGUOUS_SLUG");
  return entries[0];
}

export function readBundle(source: string, flat = false) {
  if (!flat) safeDirectory(source);
  const files = new Map<string, Buffer>();
  for (const name of flat ? ["index.md"] : fs.readdirSync(source).sort()) {
    validateSegment(name, "filename");
    const full = flat ? source : path.join(source, name);
    const stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new ContentValidationError("文章包包含非普通文件");
    classifyFile(name);
    files.set(name, fs.readFileSync(full));
  }
  if (!files.has("index.md")) throw new ContentValidationError("文章缺少 index.md");
  return files;
}

export function describeBundle(entry: ReturnType<typeof locateBlog>) {
  const buffers = readBundle(entry.source, entry.flat);
  const markdown = new TextDecoder("utf-8", { fatal: true }).decode(buffers.get("index.md")!);
  const metadata = markdownMetadata(markdown);
  const body = markdown.replace(/\r\n?/g, "\n").replace(/^---\n((?:[^\n]*\n)*?)---[ \t]*(?:\n|$)/, "").replace(/^\n+/, "");
  const hash = crypto.createHash("sha256").update(entry.category).update("\0");
  const files = [...buffers].map(([name, buffer]) => {
    const digest = crypto.createHash("sha256").update(buffer).digest("hex");
    hash.update(name).update("\0").update(digest).update("\0");
    return { name, size: buffer.length, hash: digest };
  });
  return {
    slug: entry.slug, category: String(metadata.category || entry.category || "未分类"),
    markdown, metadata, files, revision: hash.digest("hex"),
    title: String(metadata.title || /^# ([^\n]+)(?:\n|$)/.exec(body)?.[1] || entry.slug),
    draft: metadata.draft === true,
  };
}

export function bundleZip(slug: string, source: string, flat = false) {
  const files = Object.fromEntries([...readBundle(source, flat)].map(([name, buffer]) => [`${slug}/${name}`, new Uint8Array(buffer)]));
  return Buffer.from(zipSync(files, { level: 0 }));
}
